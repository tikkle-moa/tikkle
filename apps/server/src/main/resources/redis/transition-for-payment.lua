-- 결제 전환을 위한 Lua 스크립트입니다.
-- KEYS: holdVenueSeatKey 목록 -> holdDetailKey 목록 -> holdExpiryKey 목록 -> holdPerformanceKey -> holdGroupKey -> versionKey
-- ARGV[1]: holdVenueSeatKey 수
-- ARGV[2]: holdDetailKey 수
-- ARGV[3]: 만료 시각(epoch millis)
-- 이후 ARGV: 좌석별 예상 holdId 목록 -> 예상 원본 JSON 목록 -> 갱신할 JSON 목록 -> 갱신할 holdId 목록
-- 반환값: "결과 코드:version" (성공 "0:version", 충돌 또는 유효하지 않은 만료 시각 "1:0")

local venueSeatKeyCount = tonumber(ARGV[1])
local holdDetailKeyCount = tonumber(ARGV[2])
local expiresAt = tonumber(ARGV[3])

local holdDetailKeyStartIndex = venueSeatKeyCount + 1
local holdExpiryKeyStartIndex = holdDetailKeyStartIndex + holdDetailKeyCount
local holdPerformanceKey = KEYS[#KEYS - 2]
local holdGroupKey = KEYS[#KEYS - 1]
local versionKey = KEYS[#KEYS]
local stateRetentionMillis = 86400000

local expectedValueStartIndex = 4
local updatedJsonStartIndex = expectedValueStartIndex + venueSeatKeyCount + holdDetailKeyCount
local updatedHoldIdStartIndex = updatedJsonStartIndex + holdDetailKeyCount

-- 이미 지난 시각으로 연장하여 점유가 즉시 삭제되는 것을 방지합니다.
local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

if not expiresAt or expiresAt <= nowMillis then
  return '1:0'
end

-- 조회 이후 좌석 소유권이나 Hold 정보가 변경되었다면 결제 전환을 수행하지 않습니다.
for i = 0, venueSeatKeyCount + holdDetailKeyCount - 1 do
  local currentValue = redis.call('GET', KEYS[i + 1])
  local expectedValue = ARGV[expectedValueStartIndex + i]

  if currentValue ~= expectedValue then
    return '1:0'
  end
end

-- 상태 키는 만료 알림 이후 정리할 수 있도록 충분히 오래 보존합니다.
local stateExpiresAt = expiresAt + stateRetentionMillis
for i = 1, venueSeatKeyCount do
  redis.call('PEXPIREAT', KEYS[i], stateExpiresAt)
end

-- Hold 본문, 만료 트리거, 인덱스의 만료 시각을 함께 갱신합니다.
for i = 0, holdDetailKeyCount - 1 do
  redis.call('SET', KEYS[holdDetailKeyStartIndex + i], ARGV[updatedJsonStartIndex + i], 'PXAT', stateExpiresAt)
  redis.call('PEXPIREAT', KEYS[holdExpiryKeyStartIndex + i], expiresAt)
  redis.call('ZADD', holdPerformanceKey, expiresAt, ARGV[updatedHoldIdStartIndex + i])
  redis.call('ZADD', holdGroupKey, expiresAt, ARGV[updatedHoldIdStartIndex + i])
end
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
