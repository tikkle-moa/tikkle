-- scope의 HOLDING Hold 전체를 REVIEW로 전환하고 예매 정보를 고정합니다.
-- 같은 reviewToken의 재시도는 그 token의 REVIEW Hold만 반환합니다.
-- KEYS[1]: holdScopeKey, KEYS[2]: versionKey
-- ARGV: holdDetailKeyPrefix, holdVenueSeatKeyPrefix, scopeId, performanceId, reviewToken
-- 반환값: snapshot JSON, NOT_FOUND, CONFLICT

local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local holdIds = redis.call('ZRANGEBYSCORE', KEYS[1], nowMillis + 1, '+inf')

if #holdIds == 0 then
  return 'NOT_FOUND'
end

local candidates = {}
local hasSameReview = false
local changed = false
local isPersonalScope = string.sub(ARGV[3], 1, 9) == 'personal:'

for _, holdId in ipairs(holdIds) do
  local detailKey = ARGV[1] .. holdId
  local detailJson = redis.call('GET', detailKey)
  local expiry = tonumber(redis.call('ZSCORE', KEYS[1], holdId))
  if not detailJson or not expiry or expiry <= nowMillis then
    return 'CONFLICT'
  end

  local detail = cjson.decode(detailJson)
  local phase = detail.phase or 'HOLDING'
  if detail.scopeId ~= ARGV[3] or
    tonumber(detail.performanceId) ~= tonumber(ARGV[4]) or
    #detail.venueSeatIds == 0 then
    return 'CONFLICT'
  end
  if phase == 'REVIEW' then
    if detail.reviewToken ~= ARGV[5] then
      return 'CONFLICT'
    end
    hasSameReview = true
  elseif phase == 'SUPERSEDED' then
    if not isPersonalScope then
      return 'CONFLICT'
    end
  elseif phase ~= 'HOLDING' then
    return 'CONFLICT'
  end

  if phase ~= 'SUPERSEDED' then
    table.insert(candidates, {
      holdId = holdId,
      detailKey = detailKey,
      detail = detail,
      phase = phase,
      expiry = expiry,
    })
  end
end

if #candidates == 0 then
  return 'NOT_FOUND'
end

local snapshotHoldIds = {}
local venueSeatIds = {}
local seenSeatIds = {}
local earliestExpiry = nil

for _, candidate in ipairs(candidates) do
  -- 재시도라면 이후에 추가된 HOLDING Hold는 이번 예매 범위에 포함하지 않습니다.
  if not hasSameReview or candidate.phase == 'REVIEW' then
    local detail = candidate.detail
    for _, seatId in ipairs(detail.venueSeatIds) do
      if seenSeatIds[seatId] or redis.call('GET', ARGV[2] .. seatId) ~= candidate.holdId then
        return 'CONFLICT'
      end
      seenSeatIds[seatId] = true
      table.insert(venueSeatIds, seatId)
    end

    earliestExpiry = math.min(earliestExpiry or candidate.expiry, candidate.expiry)
    table.insert(snapshotHoldIds, candidate.holdId)

    if candidate.phase == 'HOLDING' then
      detail.phase = 'REVIEW'
      detail.reviewToken = ARGV[5]
      redis.call('SET', candidate.detailKey, cjson.encode(detail), 'KEEPTTL')
      changed = true
    end
  end
end

table.sort(venueSeatIds)
local version = tonumber(redis.call('GET', KEYS[2])) or 0
if changed then
  version = redis.call('INCR', KEYS[2])
end

return cjson.encode({
  phase = 'REVIEW',
  scopeId = ARGV[3],
  performanceId = tonumber(ARGV[4]),
  holdIds = snapshotHoldIds,
  venueSeatIds = venueSeatIds,
  expiresAtEpochMillis = earliestExpiry,
  reviewToken = ARGV[5],
  version = version,
})
