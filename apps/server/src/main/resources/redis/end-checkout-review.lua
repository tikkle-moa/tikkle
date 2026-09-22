-- 같은 탭의 REVIEW 잠금만 해제합니다. 만료로 이미 사라졌다면 멱등 성공입니다.
-- KEYS[1]: holdGroupControlKey, ARGV[1]: reviewToken
-- 반환값: 성공 0, 다른 REVIEW/PAYMENT 상태 1

local existing = redis.call('GET', KEYS[1])
if not existing then
  return 0
end

local control = cjson.decode(existing)
if control.phase ~= 'REVIEW' or control.reviewToken ~= ARGV[1] then
  return 1
end

redis.call('DEL', KEYS[1])
return 0
