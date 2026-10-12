-- 신규 좌석의 점유 충돌 여부를 먼저 확인하여 일부 좌석만 점유되는 상황을 방지합니다.
-- KEYS: holdVenueSeatKey 목록 -> finalizingVenueSeatKey 목록 -> holdDetailKey -> holdExpiryKey -> holdPerformanceKey -> holdScopeKey -> versionKey -> holdCreatedAtKey
-- ARGV[1]: holdId
-- ARGV[2]: hold 만료 시각 (epoch millis)
-- ARGV[3]: SeatHoldDetail 객체의 JSON 문자열
-- ARGV[4]: holdVenueSeatKey 수 (finalizingVenueSeatKey 수도 동일)
-- ARGV[5]: Hold 생성 시각 (epoch millis)
-- ARGV[6]: holdDetailKey prefix
-- ARGV[7]: scopeId
-- ARGV[8]: performanceId
-- ARGV[9]: 개인 scope의 REVIEW 복원 허용 여부
-- 반환값: "결과 코드:version" (성공 "0:version", 충돌 또는 유효하지 않은 만료 시각 "1:0")

local holdId = ARGV[1]
local holdDetailJson = ARGV[3]
local expiresAt = tonumber(ARGV[2])
local venueSeatKeyCount = tonumber(ARGV[4])
local holdDetailKeyPrefix = ARGV[6]
local scopeId = ARGV[7]
local performanceId = tonumber(ARGV[8])
local mayResetReview = ARGV[9] == 'true'

local holdDetailKeyIndex = #KEYS - 5
local holdExpiryKey = KEYS[#KEYS - 4]
local holdPerformanceKey = KEYS[#KEYS - 3]
local holdScopeKey = KEYS[#KEYS - 2]
local versionKey = KEYS[#KEYS - 1]
local holdCreatedAtKey = KEYS[#KEYS]
local stateRetentionMillis = 86400000

-- 이미 지난 만료 시각으로 점유가 생성되어 즉시 삭제되는 것을 방지합니다.
local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

if not expiresAt or expiresAt <= nowMillis then
  return '1:0'
end

local reviewCandidates = {}
local activeHoldIds = redis.call('ZRANGEBYSCORE', holdScopeKey, nowMillis + 1, '+inf')

for _, activeHoldId in ipairs(activeHoldIds) do
  local activeHoldDetailKey = holdDetailKeyPrefix .. activeHoldId
  local activeHoldDetailJson = redis.call('GET', activeHoldDetailKey)
  if not activeHoldDetailJson then
    return '1:0'
  end

  local activeHoldDetail = cjson.decode(activeHoldDetailJson)
  local phase = activeHoldDetail.phase or 'HOLDING'
  if activeHoldDetail.scopeId ~= scopeId or
    tonumber(activeHoldDetail.performanceId) ~= performanceId then
    return '1:0'
  end

  if phase == 'REVIEW' then
    if not mayResetReview then
      return '1:0'
    end
    table.insert(reviewCandidates, {
      key = activeHoldDetailKey,
      detail = activeHoldDetail,
    })
  elseif phase ~= 'HOLDING' and phase ~= 'PAYMENT' and phase ~= 'SUPERSEDED' then
    return '1:0'
  end
end

-- 만료된 Hold의 좌석 키는 새 Hold를 생성하는 작업 안에서만 제거합니다.
for i = 1, venueSeatKeyCount do
  local currentHoldId = redis.call('GET', KEYS[i])
  if currentHoldId then
    local currentExpiresAt = redis.call('ZSCORE', holdPerformanceKey, currentHoldId)
    if currentExpiresAt and tonumber(currentExpiresAt) <= nowMillis then
      redis.call('DEL', KEYS[i])
    else
      return '1:0'
    end
  end
end

-- 결제 확정 유예 키가 존재하면 충돌로 처리합니다.
for i = venueSeatKeyCount + 1, holdDetailKeyIndex - 1 do
  if redis.call('EXISTS', KEYS[i]) == 1 then
    return '1:0'
  end
end

for _, candidate in ipairs(reviewCandidates) do
  candidate.detail.phase = 'HOLDING'
  candidate.detail.reviewToken = nil
  redis.call('SET', candidate.key, cjson.encode(candidate.detail), 'KEEPTTL')
end

-- 상태 키는 만료 알림 이후 정리할 수 있도록 충분히 오래 보존합니다.
local stateExpiresAt = expiresAt + stateRetentionMillis
for i = 1, venueSeatKeyCount do
	redis.call('SET', KEYS[i], holdId, 'PXAT', stateExpiresAt)
end

redis.call('SET', KEYS[holdDetailKeyIndex], holdDetailJson, 'PXAT', stateExpiresAt)
-- 지연된 환불 해제 이벤트가 이후 생성된 Hold까지 지우지 않도록 생성 시각을 보존합니다.
redis.call('SET', holdCreatedAtKey, ARGV[5], 'PXAT', stateExpiresAt)
redis.call('SET', holdExpiryKey, holdId, 'PXAT', expiresAt)
redis.call('ZADD', holdPerformanceKey, expiresAt, holdId)
redis.call('ZADD', holdScopeKey, expiresAt, holdId)
local performanceTtl = redis.call('PTTL', holdPerformanceKey)
local requestedPerformanceTtl = stateExpiresAt - nowMillis
if performanceTtl < requestedPerformanceTtl then
  redis.call('PEXPIREAT', holdPerformanceKey, stateExpiresAt)
end
local scopeTtl = redis.call('PTTL', holdScopeKey)
if scopeTtl < requestedPerformanceTtl then
  redis.call('PEXPIREAT', holdScopeKey, stateExpiresAt)
end
local version = redis.call('INCR', versionKey)

return '0:' .. version
