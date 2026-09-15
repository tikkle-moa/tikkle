-- 조회 이후 좌석 소유권이나 Hold 정보가 변경되었다면 해제하지 않습니다.
-- KEYS: holdVenueSeatKey 목록 -> 삭제할 holdDetailKey 목록 -> 갱신할 holdDetailKey 목록 -> holdGroupKey
-- ARGV[1]: holdVenueSeatKey 수
-- ARGV[2]: 삭제할 holdDetailKey 수
-- ARGV[3]: 갱신할 holdDetailKey 수
-- 이후 ARGV: 좌석별 예상 holdId 목록 -> 예상 원본 JSON(삭제 -> 갱신) 목록 -> 삭제할 holdId 목록 -> 갱신할 JSON 목록
-- 반환값: 성공 0, 충돌 1

local venueSeatKeyCount = tonumber(ARGV[1])
local emptyHoldDetailKeyCount= tonumber(ARGV[2])
local remainingHoldDetailKeyCount = tonumber(ARGV[3])

local emptyKeyStartIndex = venueSeatKeyCount + 1
local remainingKeyStartIndex = emptyKeyStartIndex + emptyHoldDetailKeyCount
local holdGroupKey = KEYS[#KEYS]

local expectedValueStartIndex = 4
local emptyHoldIdStartIndex = expectedValueStartIndex + venueSeatKeyCount + emptyHoldDetailKeyCount + remainingHoldDetailKeyCount
local remainingJsonStartIndex = emptyHoldIdStartIndex + emptyHoldDetailKeyCount

-- 다른 요청의 부분 해제나 결제 연장 결과를 덮어쓰지 않도록 변경 전에 모두 검증합니다.
local checkCount = venueSeatKeyCount + emptyHoldDetailKeyCount + remainingHoldDetailKeyCount

local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

for i = 0, checkCount - 1 do
  local currentValue = redis.call('GET', KEYS[i + 1])
  local expectedValue = ARGV[expectedValueStartIndex + i]

  if currentValue ~= expectedValue then
    return 1
  end
end

-- 검증이 완료된 요청 좌석만 해제합니다.
for i = 1, venueSeatKeyCount do
  redis.call('DEL', KEYS[i])
end

-- 남은 좌석이 없는 Hold는 본문과 사용자 인덱스에서 함께 제거합니다.
for i = 0, emptyHoldDetailKeyCount - 1 do
  redis.call('DEL', KEYS[emptyKeyStartIndex + i])
  redis.call('ZREM', holdGroupKey, ARGV[emptyHoldIdStartIndex + i])
end

-- 부분 해제로 점유 시간이 늘어나지 않도록 기존 TTL을 유지합니다.
for i = 0, remainingHoldDetailKeyCount - 1 do
  redis.call('SET', KEYS[remainingKeyStartIndex + i], ARGV[remainingJsonStartIndex + i], 'KEEPTTL')
end
redis.call('ZREMRANGEBYSCORE', holdGroupKey, '-inf', nowMillis)

return 0
