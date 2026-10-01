-- Outbox PAYMENT_CONFIRMED 이벤트를 특정 Hold에만 적용합니다.
-- KEYS: holdVenueSeatKey 목록 -> finalizingVenueSeatKey 목록 -> holdDetailKey -> holdExpiryKey -> holdPerformanceKey -> holdGroupKey -> outbox marker key -> versionKey
-- ARGV[1]: 예상 holdId
-- ARGV[2]: 좌석 키 수
-- 반환값: "결과 코드:version" (0=확정, 1=좌석 소유권 충돌, 2=이미 확정·해제됨)

local seatCount = tonumber(ARGV[2])
local finalizingKeyStartIndex = seatCount + 1
local holdDetailKey = KEYS[seatCount * 2 + 1]
local holdExpiryKey = KEYS[seatCount * 2 + 2]
local holdPerformanceKey = KEYS[seatCount * 2 + 3]
local holdGroupKey = KEYS[seatCount * 2 + 4]
local markerKey = KEYS[seatCount * 2 + 5]
local versionKey = KEYS[seatCount * 2 + 6]
local expectedHoldId = ARGV[1]
local missingSeatCount = 0

if redis.call('EXISTS', markerKey) == 1 then
  local appliedVersion = tonumber(redis.call('GET', markerKey)) or tonumber(redis.call('GET', versionKey)) or 0
  return '2:' .. appliedVersion
end

for i = 1, seatCount do
  local currentHoldId = redis.call('GET', KEYS[i])
  if not currentHoldId then
    missingSeatCount = missingSeatCount + 1
  elseif currentHoldId ~= expectedHoldId then
    return '1:0'
  end
end

if missingSeatCount == seatCount then
  redis.call('DEL', holdDetailKey)
  redis.call('DEL', holdExpiryKey)
  redis.call('ZREM', holdPerformanceKey, expectedHoldId)
  redis.call('ZREM', holdGroupKey, expectedHoldId)
  local version = redis.call('INCR', versionKey)
  redis.call('SET', markerKey, version, 'PX', 86400000)
  return '2:' .. version
end

if missingSeatCount > 0 then
  return '1:0'
end

for i = 1, seatCount do
  if redis.call('EXISTS', KEYS[finalizingKeyStartIndex + i - 1]) == 1 then
    return '1:0'
  end
end

for i = 1, seatCount do
  redis.call('DEL', KEYS[i])
  redis.call('SET', KEYS[finalizingKeyStartIndex + i - 1], 'FINALIZING', 'PX', 60000)
end

redis.call('DEL', holdDetailKey)
redis.call('DEL', holdExpiryKey)
redis.call('ZREM', holdPerformanceKey, expectedHoldId)
redis.call('ZREM', holdGroupKey, expectedHoldId)
local version = redis.call('INCR', versionKey)
redis.call('SET', markerKey, version, 'PX', 86400000)

return '0:' .. version
