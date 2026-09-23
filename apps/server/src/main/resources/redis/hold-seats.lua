-- 신규 좌석의 점유 충돌 여부를 먼저 확인하여 일부 좌석만 점유되는 상황을 방지합니다.
-- KEYS: holdVenueSeatKey 목록 -> finalizingVenueSeatKey 목록 -> holdDetailKey -> holdGroupKey -> holdGroupControlKey
-- ARGV[1]: holdId
-- ARGV[2]: hold 만료 시각 (epoch millis)
-- ARGV[3]: SeatHoldDetail 객체의 JSON 문자열
-- ARGV[4]: holdVenueSeatKey 수 (finalizingVenueSeatKey 수도 동일)
-- 반환값: 성공 0, 충돌 또는 유효하지 않은 만료 시각 1

local holdId = ARGV[1]
local holdDetailJson = ARGV[3]
local expiresAt = tonumber(ARGV[2])
local venueSeatKeyCount = tonumber(ARGV[4])

local holdDetailKeyIndex = #KEYS - 2
local holdGroupKey = KEYS[#KEYS - 1]

if redis.call('EXISTS', KEYS[#KEYS]) == 1 then
  return 1
end

-- 이미 지난 만료 시각으로 점유가 생성되어 즉시 삭제되는 것을 방지합니다.
local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

if not expiresAt or expiresAt <= nowMillis then
  return 1
end

-- 일반 점유와 결제 확정 유예 점유 중 하나라도 존재하면 충돌로 처리합니다.
for i = 1, holdDetailKeyIndex - 1 do
	if redis.call('EXISTS', KEYS[i]) == 1 then
		return 1
	end
end

-- 실제 점유는 일반 좌석 키에만 기록합니다. 결제 확정 유예 키는 충돌 방지용입니다.
for i = 1, venueSeatKeyCount do
	redis.call('SET', KEYS[i], holdId, 'PXAT', expiresAt)
end

redis.call('SET', KEYS[holdDetailKeyIndex], holdDetailJson, 'PXAT', expiresAt)
redis.call('ZADD', holdGroupKey, expiresAt, holdId)
redis.call('PEXPIREAT', holdGroupKey, expiresAt + 60000)
redis.call('ZREMRANGEBYSCORE', holdGroupKey, '-inf', nowMillis)

return 0
