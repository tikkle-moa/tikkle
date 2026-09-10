-- V13__add_payment_confirmation_state.sql
-- 결제 확인 상태를 나타내는 새로운 상태를 추가합니다.

ALTER TABLE reservations
MODIFY COLUMN status ENUM(
    'PAYMENT_PENDING',
    'PAYMENT_CONFIRMING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'EXPIRED',
    'REFUND_REQUIRED',
    'REFUNDED'
) NOT NULL;

ALTER TABLE reservations
ADD COLUMN payment_attempt_key VARCHAR(200) NULL UNIQUE AFTER payment_expires_at,
ADD COLUMN payment_confirming_at DATETIME NULL AFTER payment_attempt_key;

CREATE INDEX idx_reservations_payment_confirming ON reservations (status, payment_confirming_at);
