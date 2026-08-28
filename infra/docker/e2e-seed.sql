-- e2e-seed.sql
-- E2E 전용 테스트 DB 시드

SET NAMES utf8mb4;

INSERT INTO
    venues (
        id,
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
        900000,
        'E2E 테스트 공연장',
        '서울특별시 E2E구 테스트로 1',
        'E2E 테스트 전용 공연장입니다.',
        100.00,
        100.00,
        30.00,
        7.50,
        40.00,
        15.00,
        NOW()
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    address = VALUES(address),
    description = VALUES(description),
    width = VALUES(width),
    height = VALUES(height),
    stage_position_x = VALUES(stage_position_x),
    stage_position_y = VALUES(stage_position_y),
    stage_width = VALUES(stage_width),
    stage_height = VALUES(stage_height);

SET @e2e_venue_name = 'E2E 테스트 공연장';

SET
    @e2e_venue_id = (
        SELECT id
        FROM venues
        WHERE
            name = @e2e_venue_name
        ORDER BY id
        LIMIT 1
    );

INSERT INTO
    concerts (
        id,
        venue_id,
        title,
        genre,
        poster_url,
        description,
        created_at
    )
VALUES (
        900000,
        @e2e_venue_id,
        'E2E 정상 콘서트',
        'INDIE',
        NULL,
        '정상 상세 흐름 검증용 데이터입니다.',
        NOW()
    ),
    (
        900001,
        @e2e_venue_id,
        'E2E 회차 없는 콘서트',
        'INDIE',
        NULL,
        '회차 없음 상태 검증용 데이터입니다.',
        NOW()
    )
ON DUPLICATE KEY UPDATE
    venue_id = VALUES(venue_id),
    title = VALUES(title),
    genre = VALUES(genre),
    poster_url = VALUES(poster_url),
    description = VALUES(description);

INSERT INTO
    performances (
        id,
        concert_id,
        name,
        starts_at,
        booking_opens_at,
        created_at
    )
VALUES (
        900000,
        900000,
        'E2E 정상 콘서트 1회차',
        DATE_ADD(NOW(), INTERVAL 30 DAY),
        DATE_ADD(NOW(), INTERVAL 7 DAY),
        NOW()
    ),
    (
        900001,
        900000,
        'E2E 종료 회차',
        DATE_SUB(NOW(), INTERVAL 30 DAY),
        DATE_SUB(NOW(), INTERVAL 60 DAY),
        NOW()
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    starts_at = VALUES(starts_at),
    booking_opens_at = VALUES(booking_opens_at);
