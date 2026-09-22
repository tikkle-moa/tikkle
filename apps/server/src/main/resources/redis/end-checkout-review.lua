-- REVIEW 잠금은 해제하고, 이미 PAYMENT로 전환된 경우에는 좌석 점유를 유지한 채 이탈할 수 있도록 처리합니다.
-- KEYS[1]: holdGroupControlKey, ARGV[1]: reviewToken
-- 반환값: REVIEW 해제 0, 다른 REVIEW 상태 1, 잠금 없음 또는 PAYMENT 2

local existing = redis.call('GET', KEYS[1])
if not existing then
  return 2
end

local control = cjson.decode(existing)
if control.phase == 'PAYMENT' then
  return 2
end

if control.phase ~= 'REVIEW' or control.reviewToken ~= ARGV[1] then
  return 1
end

redis.call('DEL', KEYS[1])
return 0
