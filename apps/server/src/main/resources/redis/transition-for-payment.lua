-- REVIEW Hold를 PAYMENT로 원자적으로 전환합니다.
-- KEYS: holdVenueSeatKey 목록 -> holdDetailKey 목록 -> holdExpiryKey 목록 -> holdPerformanceKey -> holdScopeKey -> versionKey
-- ARGV[1]: holdVenueSeatKey 수
-- ARGV[2]: holdDetailKey 수
-- ARGV[3]: 만료 시각(epoch millis)
-- 이후 ARGV: 좌석별 예상 holdId -> 예상 원본 JSON -> 갱신 JSON -> 갱신 holdId -> reservationId
-- 반환값: "결과 코드:version" (성공 "0:version", 충돌 "1:0")

local venueSeatKeyCount = tonumber(ARGV[1])
local holdDetailKeyCount = tonumber(ARGV[2])
local expiresAt = tonumber(ARGV[3])

local holdDetailKeyStartIndex = venueSeatKeyCount + 1
local holdExpiryKeyStartIndex = holdDetailKeyStartIndex + holdDetailKeyCount
local holdPerformanceKey = KEYS[#KEYS - 2]
local holdScopeKey = KEYS[#KEYS - 1]
local versionKey = KEYS[#KEYS]
local stateRetentionMillis = 86400000

local expectedValueStartIndex = 4
local updatedJsonStartIndex = expectedValueStartIndex + venueSeatKeyCount + holdDetailKeyCount
local updatedHoldIdStartIndex = updatedJsonStartIndex + holdDetailKeyCount

local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
if not expiresAt or expiresAt <= nowMillis then
  return '1:0'
end

-- 조회 시점 이후 좌석 소유권이나 REVIEW Hold가 바뀌었다면 전환하지 않습니다.
for i = 0, venueSeatKeyCount + holdDetailKeyCount - 1 do
  if redis.call('GET', KEYS[i + 1]) ~= ARGV[expectedValueStartIndex + i] then
    return '1:0'
  end
end

local stateExpiresAt = expiresAt + stateRetentionMillis
for i = 1, venueSeatKeyCount do
  redis.call('PEXPIREAT', KEYS[i], stateExpiresAt)
end

for i = 0, holdDetailKeyCount - 1 do
  redis.call('SET', KEYS[holdDetailKeyStartIndex + i], ARGV[updatedJsonStartIndex + i], 'PXAT', stateExpiresAt)
  redis.call('PEXPIREAT', KEYS[holdExpiryKeyStartIndex + i], expiresAt)
  redis.call('ZADD', holdPerformanceKey, expiresAt, ARGV[updatedHoldIdStartIndex + i])
  redis.call('ZADD', holdScopeKey, expiresAt, ARGV[updatedHoldIdStartIndex + i])
end

local requestedPerformanceTtl = stateExpiresAt - nowMillis
if redis.call('PTTL', holdPerformanceKey) < requestedPerformanceTtl then
  redis.call('PEXPIREAT', holdPerformanceKey, stateExpiresAt)
end
if redis.call('PTTL', holdScopeKey) < requestedPerformanceTtl then
  redis.call('PEXPIREAT', holdScopeKey, stateExpiresAt)
end

return '0:' .. redis.call('INCR', versionKey)
