-- 그룹 Hold 전체를 한 시점의 예매 정보로 고정합니다.
-- KEYS: holdGroupKey, holdGroupControlKey
-- ARGV: holdDetailKeyPrefix, holdVenueSeatKeyPrefix, groupId, performanceId, reviewToken
-- 반환값: snapshot JSON, NOT_FOUND, CONFLICT

local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local existing = redis.call('GET', KEYS[2])

if existing then
  local control = cjson.decode(existing)
  if control.phase == 'REVIEW' and control.reviewToken == ARGV[5] then
    return existing
  end
  return 'CONFLICT'
end

local holdIds = redis.call('ZRANGEBYSCORE', KEYS[1], nowMillis + 1, '+inf')
if #holdIds == 0 then
  return 'NOT_FOUND'
end

local venueSeatIds = {}
local seenSeatIds = {}
local earliestExpiry = nil

for _, holdId in ipairs(holdIds) do
  local detailJson = redis.call('GET', ARGV[1] .. holdId)
  local expiry = tonumber(redis.call('ZSCORE', KEYS[1], holdId))
  if not detailJson or not expiry or expiry <= nowMillis then
    return 'CONFLICT'
  end

  local detail = cjson.decode(detailJson)
  if detail.groupId ~= ARGV[3] or tonumber(detail.performanceId) ~= tonumber(ARGV[4]) or #detail.venueSeatIds == 0 then
    return 'CONFLICT'
  end

  earliestExpiry = math.min(earliestExpiry or expiry, expiry)
  for _, seatId in ipairs(detail.venueSeatIds) do
    if seenSeatIds[seatId] or redis.call('GET', ARGV[2] .. seatId) ~= holdId then
      return 'CONFLICT'
    end
    seenSeatIds[seatId] = true
    table.insert(venueSeatIds, seatId)
  end
end

table.sort(venueSeatIds)
local snapshot = cjson.encode({
  phase = 'REVIEW',
  groupId = ARGV[3],
  performanceId = tonumber(ARGV[4]),
  holdIds = holdIds,
  venueSeatIds = venueSeatIds,
  expiresAtEpochMillis = earliestExpiry,
  reviewToken = ARGV[5],
})
redis.call('SET', KEYS[2], snapshot, 'PXAT', earliestExpiry)
return snapshot
