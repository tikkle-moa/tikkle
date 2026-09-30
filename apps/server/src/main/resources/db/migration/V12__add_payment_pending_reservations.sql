-- V12__add_payment_pending_reservations.sql
-- reservations 테이블에 결제 대기 상태와 결제 관련 컬럼을 추가합니다.

ALTER TABLE reservations
MODIFY COLUMN status ENUM(
    'PAYMENT_PENDING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
) NOT NULL;

ALTER TABLE reservations
ADD COLUMN hold_id VARCHAR(100) NOT NULL UNIQUE AFTER booker_user_id,
ADD COLUMN order_id VARCHAR(100) NOT NULL UNIQUE AFTER hold_id,
ADD COLUMN order_name VARCHAR(255) NOT NULL AFTER order_id,
ADD COLUMN amount INT NOT NULL AFTER order_name,
ADD COLUMN payment_expires_at DATETIME NOT NULL AFTER status,
ADD COLUMN payment_key VARCHAR(255) NULL UNIQUE AFTER payment_expires_at;

CREATE INDEX idx_reservations_payment_expiry ON reservations (status, payment_expires_at);
