-- V15__add_outbox_events.sql
-- 외부 좌석 이벤트 전달을 위한 Transactional Outbox 테이블을 추가합니다.

CREATE TABLE outbox_events (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    event_key VARCHAR(150) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id BIGINT NOT NULL,
    performance_id BIGINT NOT NULL,
    event_type ENUM('RESERVATION_CONFIRMED', 'HOLD_RELEASED') NOT NULL,
    payload JSON NOT NULL,
    status ENUM('PENDING', 'PROCESSING', 'PUBLISHED', 'DEAD') NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NOT NULL,
    lock_token VARCHAR(100) NULL,
    locked_at DATETIME NULL,
    last_error TEXT NULL,
    occurred_at DATETIME NOT NULL,
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_outbox_event_id UNIQUE (event_id),
    CONSTRAINT uq_outbox_event_key UNIQUE (event_key),
    INDEX idx_outbox_pending (status, next_attempt_at, id),
    INDEX idx_outbox_lock (status, locked_at, id),
    INDEX idx_outbox_cleanup (status, performance_id, id)
);
