-- V16__rename_outbox_event_type_hold_released.sql
-- Outbox 이벤트 타입 HOLD_RELEASED를 RELEASED_SEATS로 변경합니다.

-- 기존 값을 보존한 채 새 값을 허용하도록 ENUM을 확장합니다.
ALTER TABLE outbox_events
MODIFY COLUMN event_type ENUM(
    'HOLD_RELEASED',
    'RELEASED_SEATS',
    'RESERVATION_CONFIRMED'
) NOT NULL;

UPDATE outbox_events
SET
    event_type = 'RELEASED_SEATS'
WHERE
    event_type = 'HOLD_RELEASED';

-- 더 이상 사용하지 않는 HOLD_RELEASED 값을 제거합니다.
ALTER TABLE outbox_events
MODIFY COLUMN event_type ENUM(
    'RELEASED_SEATS',
    'RESERVATION_CONFIRMED'
) NOT NULL;
