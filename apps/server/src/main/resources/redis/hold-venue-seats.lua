-- 신규 좌석의 점유 충돌 여부를 먼저 확인하여 일부 좌석만 점유되는 상황을 방지합니다.
-- KEYS: holdVenueSeatKey 목록 -> holdDetailKey -> holdGroupKey
-- ARGV[1]: holdId
-- ARGV[2]: hold 만료 시각 (epoch millis)
-- ARGV[3]: SeatHoldDetail 객체의 JSON 문자열
-- 반환값: 성공 0, 충돌 또는 유효하지 않은 만료 시각 1

local holdId = ARGV[1]
local holdDetailJson = ARGV[3]
local expiresAt = tonumber(ARGV[2])

local holdDetailKeyIndex = #KEYS - 1
local holdGroupKeyIndex = #KEYS

-- 이미 지난 만료 시각으로 점유가 생성되어 즉시 삭제되는 것을 방지합니다.
local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

if not expiresAt or expiresAt <= nowMillis then
  return 1
end

-- 점유 상태 충돌 확인
for i = 1, holdDetailKeyIndex - 1 do
	if redis.call('EXISTS', KEYS[i]) == 1 then
		return 1
	end
end

for i = 1, holdDetailKeyIndex - 1 do
	redis.call('SET', KEYS[i], holdId, 'PXAT', expiresAt)
end

redis.call('SET', KEYS[holdDetailKeyIndex], holdDetailJson, 'PXAT', expiresAt)
redis.call('ZADD', KEYS[holdGroupKeyIndex], expiresAt, holdId)

return 0
