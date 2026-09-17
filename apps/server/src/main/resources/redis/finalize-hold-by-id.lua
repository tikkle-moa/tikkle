-- Outbox RESERVATION_CONFIRMED 이벤트를 특정 Hold에만 적용합니다.
-- KEYS: holdVenueSeatKey 목록 -> finalizingVenueSeatKey 목록 -> holdDetailKey -> holdGroupKey
-- ARGV[1]: 예상 holdId
-- ARGV[2]: 좌석 키 수
-- 반환값: 0=확정, 1=좌석 소유권 충돌, 2=이미 확정·해제됨

local seatCount = tonumber(ARGV[2])
local finalizingKeyStartIndex = seatCount + 1
local holdDetailKey = KEYS[seatCount * 2 + 1]
local holdGroupKey = KEYS[seatCount * 2 + 2]
local expectedHoldId = ARGV[1]
local missingSeatCount = 0

for i = 1, seatCount do
  local currentHoldId = redis.call('GET', KEYS[i])
  if not currentHoldId then
    missingSeatCount = missingSeatCount + 1
  elseif currentHoldId ~= expectedHoldId then
    return 1
  end
end

if missingSeatCount == seatCount then
  return 2
end

if missingSeatCount > 0 then
  return 1
end

for i = 1, seatCount do
  if redis.call('EXISTS', KEYS[finalizingKeyStartIndex + i - 1]) == 1 then
    return 1
  end
end

for i = 1, seatCount do
  redis.call('DEL', KEYS[i])
  redis.call('SET', KEYS[finalizingKeyStartIndex + i - 1], 'FINALIZING', 'PX', 60000)
end

redis.call('DEL', holdDetailKey)
redis.call('ZREM', holdGroupKey, expectedHoldId)

return 0
