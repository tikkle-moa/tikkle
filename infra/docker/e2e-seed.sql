-- e2e-seed.sql
-- E2E 전용 테스트 DB 시드

SET NAMES utf8mb4;

INSERT INTO
    concerts (
        id,
        title,
        genre,
        place_name,
        poster_url,
        description,
        created_at
    )
VALUES (
        900000,
        'E2E 정상 콘서트',
        'INDIE',
        'E2E 테스트 공연장',
        NULL,
        '정상 상세 흐름 검증용 데이터입니다.',
        NOW()
    ),
    (
        900001,
        'E2E 회차 없는 콘서트',
        'INDIE',
        'E2E 테스트 공연장',
        NULL,
        '회차 없음 상태 검증용 데이터입니다.',
        NOW()
    )
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    genre = VALUES(genre),
    place_name = VALUES(place_name),
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
