-- V4__seed_concerts_and_performances.sql
-- 초기 콘서트 카탈로그 데이터

INSERT INTO
    concerts (
        title,
        genre,
        place_name,
        poster_url,
        description,
        created_at
    )
VALUES (
        '2026 Summer Festival',
        'FESTIVAL',
        '올림픽공원 KSPO DOME',
        'https://picsum.photos/seed/concert1/400/600',
        NULL,
        '2026-06-01 10:00:00'
    );

SET @concert_id = LAST_INSERT_ID();

INSERT INTO
    performances (
        concert_id,
        starts_at,
        booking_opens_at,
        created_at
    )
VALUES (
        @concert_id,
        '2026-08-20 19:00:00',
        '2026-07-20 10:00:00',
        '2026-06-01 10:00:00'
    );
