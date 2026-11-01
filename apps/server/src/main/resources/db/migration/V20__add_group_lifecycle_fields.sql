ALTER TABLE `groups`
    ADD COLUMN invite_code VARCHAR(36) NULL,
    ADD COLUMN leader_user_id BIGINT NULL;

UPDATE `groups`
SET invite_code = UUID()
WHERE invite_code IS NULL;

UPDATE `groups` g
SET leader_user_id = (
    SELECT gm.user_id
    FROM group_members gm
    WHERE gm.group_id = g.id
    ORDER BY gm.created_at ASC, gm.id ASC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.group_id = g.id
);

ALTER TABLE `groups`
    MODIFY COLUMN invite_code VARCHAR(36) NOT NULL,
    ADD CONSTRAINT uq_group_invite_code UNIQUE (invite_code),
    ADD CONSTRAINT fk_group_leader_user
        FOREIGN KEY (leader_user_id) REFERENCES users (id);
