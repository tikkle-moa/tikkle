-- 같은 reviewToken으로 REVIEW인 Hold를 HOLDING으로 복원합니다.
-- KEYS[1]: holdScopeKey
-- ARGV[1]: reviewToken, ARGV[2]: holdDetailKeyPrefix
-- 반환값: 복원 또는 이미 종료됨 0, 다른 REVIEW가 진행 중 1

local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local holdIds = redis.call('ZRANGEBYSCORE', KEYS[1], nowMillis + 1, '+inf')

for _, holdId in ipairs(holdIds) do
  local detailJson = redis.call('GET', ARGV[2] .. holdId)
  if detailJson then
    local detail = cjson.decode(detailJson)
    if detail.phase == 'REVIEW' and detail.reviewToken ~= ARGV[1] then
      return 1
    end
  end
end

for _, holdId in ipairs(holdIds) do
  local detailKey = ARGV[2] .. holdId
  local detailJson = redis.call('GET', detailKey)
  if detailJson then
    local detail = cjson.decode(detailJson)
    if detail.phase == 'REVIEW' and detail.reviewToken == ARGV[1] then
      detail.phase = 'HOLDING'
      detail.reviewToken = nil
      redis.call('SET', detailKey, cjson.encode(detail), 'KEEPTTL')
    end
  end
end

return 0
