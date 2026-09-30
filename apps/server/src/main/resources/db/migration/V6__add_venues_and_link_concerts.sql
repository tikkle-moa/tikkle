-- 공연장 및 공연장 좌석 테이블을 생성하고 기존 공연을 기본 공연장과 연결

CREATE TABLE venues (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    description TEXT,
    width DECIMAL(8, 2) NOT NULL,
    height DECIMAL(8, 2) NOT NULL,
    stage_position_x DECIMAL(8, 2) NOT NULL,
    stage_position_y DECIMAL(8, 2) NOT NULL,
    stage_width DECIMAL(8, 2) NOT NULL,
    stage_height DECIMAL(8, 2) NOT NULL,
    created_at DATETIME NOT NULL
);

CREATE TABLE venue_seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    venue_id BIGINT NOT NULL,
    section_name VARCHAR(50) NOT NULL,
    seat_number INT NOT NULL,
    seat_label VARCHAR(50) NOT NULL,
    price INT NOT NULL,
    position_x DECIMAL(8, 2) NOT NULL,
    position_y DECIMAL(8, 2) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_venue_seat UNIQUE (
        venue_id,
        section_name,
        seat_number
    ),
    CONSTRAINT fk_venue_seat_venue
        FOREIGN KEY (venue_id) REFERENCES venues (id)
);

INSERT INTO venues (
    name,
    address,
    description,
    width,
    height,
    stage_position_x,
    stage_position_y,
    stage_width,
    stage_height,
    created_at
)
VALUES (
    '올림픽공원 KSPO DOME',
    '서울특별시 송파구 올림픽로 424',
    '기본 공연장',
    100.00,
    100.00,
    30.00,
    5.00,
    40.00,
    15.00,
    CURRENT_TIMESTAMP
);

SET @default_venue_id = LAST_INSERT_ID();

ALTER TABLE concerts
ADD COLUMN venue_id BIGINT NULL AFTER id,
ADD COLUMN venue_name VARCHAR(255) NULL AFTER genre;

UPDATE concerts
SET venue_id = @default_venue_id
WHERE venue_id IS NULL;

UPDATE concerts c
JOIN venues v ON v.id = c.venue_id
SET c.venue_name = v.name;

ALTER TABLE concerts
MODIFY COLUMN venue_id BIGINT NOT NULL,
MODIFY COLUMN venue_name VARCHAR(255) NOT NULL,
DROP COLUMN place_name,
ADD CONSTRAINT fk_concert_venue
    FOREIGN KEY (venue_id) REFERENCES venues (id);
