-- 기존 그룹 초대 코드를 8자리로 전환한다.
CREATE TEMPORARY TABLE group_invite_code_migration (
    group_id BIGINT NOT NULL PRIMARY KEY,
    code_bytes BINARY(8) NOT NULL
);

INSERT INTO group_invite_code_migration (group_id, code_bytes)
SELECT id, RANDOM_BYTES(8)
FROM `groups`
WHERE CHAR_LENGTH(invite_code) <> 8;

UPDATE `groups` g
JOIN group_invite_code_migration m ON m.group_id = g.id
SET g.invite_code = CONCAT(
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 1, 1)), 32), 1),
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 2, 1)), 32), 1),
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 3, 1)), 32), 1),
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 4, 1)), 32), 1),
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 5, 1)), 32), 1),
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 6, 1)), 32), 1),
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 7, 1)), 32), 1),
        SUBSTRING('abcdefghjklmnpqrstuvwxyz23456789', 1 + MOD(ORD(SUBSTRING(m.code_bytes, 8, 1)), 32), 1)
    );

DROP TEMPORARY TABLE group_invite_code_migration;

ALTER TABLE `groups`
    MODIFY COLUMN invite_code VARCHAR(8) NOT NULL;

-- 결제 시작 당시 그룹원 정보를 예매와 함께 보관한다.
CREATE TABLE reservation_group_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    profile_image_url VARCHAR(500) NULL,
    CONSTRAINT uq_reservation_group_member UNIQUE (reservation_id, user_id),
    CONSTRAINT fk_reservation_group_member_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations (id)
);
