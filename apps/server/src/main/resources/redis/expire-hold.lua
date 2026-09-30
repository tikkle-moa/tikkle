-- 만료 트리거가 가리키는 Hold를 정리하고, 상태 변경과 version 증가를 함께 수행합니다.
-- KEYS: holdVenueSeatKey 목록 -> holdDetailKey -> holdPerformanceKey -> holdGroupKey -> versionKey
-- ARGV[1]: 예상 holdId
-- ARGV[2]: 예상 Hold 상세 JSON
-- ARGV[3]: 현재 시각(epoch millis)
-- ARGV[4]: holdVenueSeatKey 수
-- 이후 ARGV: holdVenueSeatId 목록
-- 반환값: 실제로 해제한 좌석과 version을 담은 JSON, 더 이상 유효하지 않은 트리거면 nil

local expectedHoldId = ARGV[1]
local expectedHoldDetail = ARGV[2]
local nowMillis = tonumber(ARGV[3])
local seatCount = tonumber(ARGV[4])

local holdDetailKey = KEYS[seatCount + 1]
local holdPerformanceKey = KEYS[seatCount + 2]
local holdGroupKey = KEYS[seatCount + 3]
local versionKey = KEYS[seatCount + 4]

if redis.call('GET', holdDetailKey) ~= expectedHoldDetail then
  return nil
end

local expiresAt = redis.call('ZSCORE', holdPerformanceKey, expectedHoldId)
if not expiresAt or tonumber(expiresAt) > nowMillis then
  return nil
end

local releasedSeatIds = {}
for i = 1, seatCount do
  if redis.call('GET', KEYS[i]) == expectedHoldId then
    redis.call('DEL', KEYS[i])
    table.insert(releasedSeatIds, tonumber(ARGV[4 + i]))
  end
end

redis.call('DEL', holdDetailKey)
redis.call('ZREM', holdPerformanceKey, expectedHoldId)
redis.call('ZREM', holdGroupKey, expectedHoldId)

if #releasedSeatIds == 0 then
  return nil
end

local version = redis.call('INCR', versionKey)

return cjson.encode({ version = version, venueSeatIds = releasedSeatIds })
