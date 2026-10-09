-- PAYMENT_CANCELLED 이벤트에서 예매된 좌석과 이전 Hold만 해제합니다.
-- KEYS: holdVenueSeatKey 목록 -> finalizingVenueSeatKey 목록 -> outbox marker key -> versionKey
-- ARGV: 좌석 수, scopeId, 취소 시각(epoch millis), hold detail/created-at/expiry/performance/scope/seat/finalizing key prefix, seat ID 목록
-- 반환값: "결과 코드:version|해제 좌석 ID 목록" (0=해제, 3=이미 처리됨)

local seatCount = tonumber(ARGV[1])
local finalizingStartIndex = seatCount + 1
local markerKey = KEYS[seatCount * 2 + 1]
local versionKey = KEYS[seatCount * 2 + 2]
local scopeId = ARGV[2]
local cancelledAtEpochMillis = tonumber(ARGV[3])
local holdDetailPrefix = ARGV[4]
local holdCreatedAtPrefix = ARGV[5]
local holdExpiryPrefix = ARGV[6]
local holdPerformanceKey = ARGV[7]
local holdScopeKey = ARGV[8]
local holdVenueSeatPrefix = ARGV[9]
local finalizingVenueSeatPrefix = ARGV[10]
local seatIdStartIndex = 11

if redis.call('EXISTS', markerKey) == 1 then
  return '3:' .. redis.call('GET', markerKey)
end

local releasedSeatIds = {}
local releasedSeatIdSet = {}
local processedHoldIds = {}
local releasedHoldIds = {}

local function addReleasedSeatId(seatId)
  if not releasedSeatIdSet[seatId] then
    releasedSeatIdSet[seatId] = true
    table.insert(releasedSeatIds, seatId)
  end
end

for i = 1, seatCount do
  local seatId = ARGV[seatIdStartIndex + i - 1]
  local holdVenueSeatKey = KEYS[i]
  local finalizingVenueSeatKey = KEYS[finalizingStartIndex + i - 1]
  local currentHoldId = redis.call('GET', holdVenueSeatKey)

  if not currentHoldId then
    redis.call('DEL', finalizingVenueSeatKey)
    addReleasedSeatId(seatId)
  elseif not processedHoldIds[currentHoldId] then
    processedHoldIds[currentHoldId] = true
    local holdDetailJson = redis.call('GET', holdDetailPrefix .. currentHoldId)
    if holdDetailJson then
      local ok, holdDetail = pcall(cjson.decode, holdDetailJson)
      local createdAtEpochMillis = tonumber(redis.call('GET', holdCreatedAtPrefix .. currentHoldId)) or 0
      if ok and
        tostring(holdDetail.scopeId) == scopeId and
        tonumber(holdDetail.performanceId) and
        tonumber(holdDetail.performanceId) == tonumber(string.match(holdVenueSeatKey, '(%d+):%d+$')) and
        createdAtEpochMillis < cancelledAtEpochMillis then
        table.insert(releasedHoldIds, currentHoldId)
        for _, heldSeatId in ipairs(holdDetail.venueSeatIds or {}) do
          local seatKey = holdVenueSeatPrefix .. tostring(heldSeatId)
          if redis.call('GET', seatKey) == currentHoldId then
            redis.call('DEL', seatKey)
            redis.call('DEL', finalizingVenueSeatPrefix .. tostring(heldSeatId))
            addReleasedSeatId(tostring(heldSeatId))
          end
        end
      end
    end
  end
end

for _, holdId in ipairs(releasedHoldIds) do
  redis.call('DEL', holdDetailPrefix .. holdId)
  redis.call('DEL', holdExpiryPrefix .. holdId)
  redis.call('ZREM', holdPerformanceKey, holdId)
  redis.call('ZREM', holdScopeKey, holdId)
end

table.sort(releasedSeatIds, function(left, right)
  return tonumber(left) < tonumber(right)
end)

local version = tonumber(redis.call('GET', versionKey)) or 0
if #releasedSeatIds > 0 then
  version = redis.call('INCR', versionKey)
end

local markerValue = tostring(version) .. '|' .. table.concat(releasedSeatIds, ',')
redis.call('SET', markerKey, markerValue, 'PX', 86400000)
return '0:' .. markerValue
