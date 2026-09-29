-- 신규 좌석의 점유 충돌 여부를 먼저 확인하여 일부 좌석만 점유되는 상황을 방지합니다.
-- KEYS: holdVenueSeatKey 목록 -> finalizingVenueSeatKey 목록 -> holdDetailKey -> holdExpiryKey -> holdPerformanceKey -> holdGroupKey -> versionKey -> holdGroupControlKey
-- ARGV[1]: holdId
-- ARGV[2]: hold 만료 시각 (epoch millis)
-- ARGV[3]: SeatHoldDetail 객체의 JSON 문자열
-- ARGV[4]: holdVenueSeatKey 수 (finalizingVenueSeatKey 수도 동일)
-- 반환값: "결과 코드:version" (성공 "0:version", 충돌 또는 유효하지 않은 만료 시각 "1:0")

local holdId = ARGV[1]
local holdDetailJson = ARGV[3]
local expiresAt = tonumber(ARGV[2])
local venueSeatKeyCount = tonumber(ARGV[4])

local holdDetailKeyIndex = #KEYS - 5
local holdExpiryKey = KEYS[#KEYS - 4]
local holdPerformanceKey = KEYS[#KEYS - 3]
local holdGroupKey = KEYS[#KEYS - 2]
local versionKey = KEYS[#KEYS - 1]
local stateRetentionMillis = 86400000
if redis.call('EXISTS', KEYS[#KEYS]) == 1 then
  return '1:0'
end

-- 이미 지난 만료 시각으로 점유가 생성되어 즉시 삭제되는 것을 방지합니다.
local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

if not expiresAt or expiresAt <= nowMillis then
  return '1:0'
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

-- 상태 키는 만료 알림 이후 정리할 수 있도록 충분히 오래 보존합니다.
local stateExpiresAt = expiresAt + stateRetentionMillis
for i = 1, venueSeatKeyCount do
	redis.call('SET', KEYS[i], holdId, 'PXAT', stateExpiresAt)
end

redis.call('SET', KEYS[holdDetailKeyIndex], holdDetailJson, 'PXAT', stateExpiresAt)
redis.call('SET', holdExpiryKey, holdId, 'PXAT', expiresAt)
redis.call('ZADD', holdPerformanceKey, expiresAt, holdId)
redis.call('ZADD', holdGroupKey, expiresAt, holdId)
local performanceTtl = redis.call('PTTL', holdPerformanceKey)
local requestedPerformanceTtl = stateExpiresAt - nowMillis
if performanceTtl < requestedPerformanceTtl then
  redis.call('PEXPIREAT', holdPerformanceKey, stateExpiresAt)
end
local groupTtl = redis.call('PTTL', holdGroupKey)
if groupTtl < requestedPerformanceTtl then
  redis.call('PEXPIREAT', holdGroupKey, stateExpiresAt)
end
local version = redis.call('INCR', versionKey)

return '0:' .. version
