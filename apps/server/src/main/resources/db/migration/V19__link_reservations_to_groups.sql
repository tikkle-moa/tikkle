-- 기존 group_id 문자열은 이전 Hold 식별자이므로 모두 개인 예약으로 전환한다.
-- 이후 생성되는 그룹 예약만 groups.id를 group_id에 저장한다.

ALTER TABLE reservations
    DROP INDEX hold_id,
    ADD COLUMN group_id_numeric BIGINT NULL AFTER booker_user_id;

ALTER TABLE reservations
    DROP COLUMN group_id,
    RENAME COLUMN group_id_numeric TO group_id,
    ADD COLUMN payment_scope_key VARCHAR(100)
        GENERATED ALWAYS AS (
            CASE
                WHEN status IN ('PAYMENT_PENDING', 'PAYMENT_CONFIRMING') THEN
                    CASE
                        WHEN group_id IS NULL
                            THEN CONCAT('personal:', booker_user_id, ':', performance_id)
                        ELSE CONCAT('group:', group_id)
                    END
                ELSE NULL
            END
        ) STORED,
    ADD CONSTRAINT uq_reservations_payment_scope UNIQUE (payment_scope_key),
    ADD CONSTRAINT fk_reservation_group
        FOREIGN KEY (group_id) REFERENCES `groups` (id);
