-- 공연별 동행 예매 그룹과 그룹 멤버십을 영속화한다.
-- `groups`는 MySQL 예약어이므로 물리 테이블명은 `ticket_groups`를 사용한다.

CREATE TABLE ticket_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    performance_id BIGINT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_ticket_group_performance
        FOREIGN KEY (performance_id) REFERENCES performances (id),
    INDEX idx_ticket_groups_performance_expires_at (performance_id, expires_at)
);

CREATE TABLE group_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id),
    CONSTRAINT fk_group_member_group
        FOREIGN KEY (group_id) REFERENCES ticket_groups (id),
    CONSTRAINT fk_group_member_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    INDEX idx_group_members_user_id (user_id)
);
