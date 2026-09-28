-- REVIEW 잠금은 해제하고, 이미 PAYMENT로 전환된 경우에는 좌석 점유를 유지한 채 이탈할 수 있도록 처리합니다.
-- KEYS[1]: holdGroupControlKey, KEYS[2]: review 결과 키, ARGV[1]: reviewToken
-- 반환값: REVIEW 해제 0, 다른 REVIEW 상태 1, 잠금 없음 또는 PAYMENT 2, 같은 토큰으로 이미 해제 3

local existing = redis.call('GET', KEYS[1])
if existing then
  local control = cjson.decode(existing)
  if control.phase == 'PAYMENT' then
    return 2
  end

  if control.phase ~= 'REVIEW' or control.reviewToken ~= ARGV[1] then
    return 1
  end

  -- 응답 유실 후 같은 요청이 재전송되면 성공을 복구할 수 있도록 Hold 만료까지 결과를 보관합니다.
  redis.call('SET', KEYS[2], ARGV[1], 'PXAT', control.expiresAtEpochMillis)
  redis.call('DEL', KEYS[1])
  return 0
end

if redis.call('GET', KEYS[2]) == ARGV[1] then
  return 3
end

return 2
