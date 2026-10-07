-- 개인 scope에서 새 선택으로 대체된 결제 Hold를 자연 만료 전까지 좌석 점유로 유지합니다.
-- KEYS[1]: holdScopeKey, KEYS[2]: versionKey
-- ARGV: holdDetailKeyPrefix, scopeId, reservationId
-- 반환값: 변경 후 version

local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local holdIds = redis.call('ZRANGEBYSCORE', KEYS[1], nowMillis + 1, '+inf')
-- Redis Lua는 실행 중 다른 명령이 끼어들지 않지만, 변경 후 오류가 나면 이미 수행한
-- 변경은 되돌아가지 않습니다. 따라서 모든 Hold를 먼저 검증합니다.
for _, holdId in ipairs(holdIds) do
  local detailKey = ARGV[1] .. holdId
  local detailJson = redis.call('GET', detailKey)
  if not detailJson then
    return nil
  end

  local detail = cjson.decode(detailJson)
  if detail.scopeId ~= ARGV[2] then
    return nil
  end
end

local changed = false

for _, holdId in ipairs(holdIds) do
  local detailKey = ARGV[1] .. holdId
  local detail = cjson.decode(redis.call('GET', detailKey))

  if detail.phase == 'PAYMENT' and tostring(detail.reservationId) == ARGV[3] then
    detail.phase = 'SUPERSEDED'
    redis.call('SET', detailKey, cjson.encode(detail), 'KEEPTTL')
    changed = true
  end
end

if changed then
  return redis.call('INCR', KEYS[2])
end

return tonumber(redis.call('GET', KEYS[2]) or '0')
