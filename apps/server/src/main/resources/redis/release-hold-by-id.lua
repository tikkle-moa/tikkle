-- Outbox HOLD_RELEASED 이벤트를 특정 Hold에만 적용합니다.
-- KEYS: holdVenueSeatKey 목록 -> holdDetailKey -> holdGroupKey -> outbox marker key
-- ARGV[1]: 예상 holdId
-- ARGV[2]: 좌석 키 수
-- ARGV[3]: outbox event ID
-- 반환값: 0=해제, 1=최신 Hold가 존재함, 2=이미 해제·만료됨, 3=이 이벤트가 이미 해제함

local seatCount = tonumber(ARGV[2])
local holdDetailKey = KEYS[seatCount + 1]
local holdGroupKey = KEYS[seatCount + 2]
local markerKey = KEYS[seatCount + 3]
local expectedHoldId = ARGV[1]
local missingSeatCount = 0

if redis.call('EXISTS', markerKey) == 1 then
  return 3
end

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
  redis.call('DEL', KEYS[i])
end

redis.call('DEL', holdDetailKey)
redis.call('ZREM', holdGroupKey, expectedHoldId)
redis.call('SET', markerKey, 'APPLIED', 'PX', 86400000)

return 0
