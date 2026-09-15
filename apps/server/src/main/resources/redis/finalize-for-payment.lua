-- 좌석 점유 정보를 최종 확정하는 Lua 스크립트입니다.
-- KEYS: holdVenueSeatKey 목록 -> finalizingVenueSeatKey 목록 -> holdDetailKey 목록 -> holdGroupKey
-- ARGV[1]: holdVenueSeatKey 수
-- ARGV[2]: holdDetailKey 수
-- 이후 ARGV: 좌석별 예상 holdId 목록 -> 예상 원본 JSON 목록
-- 반환값: 성공 0, 충돌 또는 유효하지 않은 만료 시각 1

local seatCount = tonumber(ARGV[1])
local detailCount = tonumber(ARGV[2])

local finalizingKeyStartIndex = seatCount + 1
local detailKeyStartIndex = finalizingKeyStartIndex + seatCount
local holdGroupKey = KEYS[#KEYS]

local expectedValueStartIndex = 3

-- 조회 이후 좌석 소유권이 변경되었다면 점유를 확정하지 않습니다.
for i = 0, seatCount - 1 do
  local currentValue = redis.call('GET', KEYS[i + 1])
  local expectedValue = ARGV[expectedValueStartIndex + i]

  if currentValue ~= expectedValue then
    return 1
  end
end

-- 조회 이후 Hold 정보가 변경되었다면 점유를 확정하지 않습니다.
for i = 0, detailCount - 1 do
  local currentValue = redis.call('GET', KEYS[detailKeyStartIndex + i])
  local expectedValue = ARGV[expectedValueStartIndex + seatCount + i]

  if currentValue ~= expectedValue then
    return 1
  end
end

-- 이미 최종 확정 처리 중인 좌석이 하나라도 있다면 중복 확정을 방지합니다.
for i = 0, seatCount - 1 do
  if redis.call('EXISTS', KEYS[finalizingKeyStartIndex + i]) == 1 then
    return 1
  end
end

-- 일반 좌석 키를 삭제하고 별도 패턴의 유예 키를 60초 동안 유지합니다.
for i = 1, seatCount do
  redis.call('DEL', KEYS[i])
  redis.call('SET', KEYS[finalizingKeyStartIndex + i - 1], 'FINALIZING', 'PX', 60000)
end

-- Hold 상세 정보 삭제
for i = 0, detailCount - 1 do
  redis.call('DEL', KEYS[detailKeyStartIndex + i])
end

-- 그룹 인덱스 삭제
redis.call('DEL', holdGroupKey)

return 0
