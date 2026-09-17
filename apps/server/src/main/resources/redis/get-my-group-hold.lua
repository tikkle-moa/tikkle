-- 현재 사용자의 보유 좌석 정보를 가져오는 Lua 스크립트
-- KEYS[1]: holdGroupKey
-- ARGV[1]: holdDetailKeyPrefix
-- 반환값: List of VenueSeatHoldDetail

local holdGroupKey = KEYS[1]
local holdDetailKeyPrefix = ARGV[1]

local now = redis.call('TIME')
local nowMillis = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)

local holdIds = redis.call('ZRANGEBYSCORE', holdGroupKey, nowMillis, '+inf')

local heldSeatsJson = {}

for _, holdId in ipairs(holdIds) do
    local detailJson = redis.call('GET', holdDetailKeyPrefix .. holdId)

    if detailJson then
        table.insert(heldSeatsJson, detailJson)
    end
end

return '[' .. table.concat(heldSeatsJson, ',') .. ']'