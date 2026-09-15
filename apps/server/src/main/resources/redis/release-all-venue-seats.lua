-- 해당 그룹에 대한 모든 좌석을 해제하고, holdGroupKey를 삭제합니다.
-- KEYS: holdVenueSeatKey 목록 -> holdDetailKey 목록 -> holdGroupKey
-- ARGV[1]: holdVenueSeatKey 수
-- ARGV[2]: holdDetailKey 수
-- 이후 ARGV: 좌석별 예상 holdId 목록 -> 예상 원본 JSON 목록
-- 반환값: 성공 0, 충돌 1

local venueSeatKeyCount = tonumber(ARGV[1])
local holdDetailKeyCount = tonumber(ARGV[2])

local holdDetailKeyStartIndex = venueSeatKeyCount + 1
local holdGroupKey = KEYS[#KEYS]

local expectedValueStartIndex = 3

-- hold 상세 정보 검증
for i = 0, venueSeatKeyCount + holdDetailKeyCount - 1 do
	local currentValue = redis.call('GET', KEYS[i + 1])
	local expectedValue = ARGV[expectedValueStartIndex + i]

	if currentValue ~= expectedValue then
		return 1
	end
end

-- 좌석 점유 삭제
for i = 1, venueSeatKeyCount do
	redis.call('DEL', KEYS[i])
end

-- hold 상세 정보 삭제
for i = 0, holdDetailKeyCount - 1 do
	redis.call('DEL', KEYS[holdDetailKeyStartIndex + i])
end

-- 그룹의 hold 목록 삭제
redis.call('DEL', holdGroupKey)

return 0
