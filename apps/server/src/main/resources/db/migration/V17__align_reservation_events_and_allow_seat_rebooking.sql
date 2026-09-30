-- 기존 Outbox 이벤트를 현재 enum 이름으로 옮기고 환불 이벤트를 추가합니다.
ALTER TABLE reservations
    MODIFY COLUMN status ENUM(
        'PAYMENT_PENDING',
        'PAYMENT_CONFIRMING',
        'CANCELLATION_PENDING',
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REFUND_REQUIRED',
        'REFUNDED'
    ) NOT NULL;

ALTER TABLE outbox_events
    MODIFY COLUMN event_type ENUM(
        'RELEASED_SEATS',
        'RESERVATION_CONFIRMED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_CANCELLED'
    ) NOT NULL;

UPDATE outbox_events
SET event_type = 'PAYMENT_CONFIRMED'
WHERE event_type = 'RESERVATION_CONFIRMED';

ALTER TABLE outbox_events
    MODIFY COLUMN event_type ENUM(
        'RELEASED_SEATS',
        'PAYMENT_CONFIRMED',
        'PAYMENT_CANCELLED'
    ) NOT NULL;

ALTER TABLE reservation_seats
    ADD INDEX idx_reservation_seats_performance_id (performance_id);

ALTER TABLE reservation_seats
    DROP INDEX uq_reservation_performance_venue_seat;
