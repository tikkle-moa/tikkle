-- 기본 공연장을 10구역 1,500석 가상 좌석 배치도로 구성한다.
-- 가상 캔버스는 1,600 × 900이며 각 구역은 15열 × 10행, 150석이다.
-- A~E구역은 전방, F~J구역은 후방에 배치한다.

UPDATE venues
SET
    description = 'SVG 및 Canvas 좌석 배치도 검증용 가상 공연장',
    width = 1600.00,
    height = 900.00,
    stage_position_x = 800.00,
    stage_position_y = 90.00,
    stage_width = 420.00,
    stage_height = 54.00
WHERE
    name = '올림픽공원 KSPO DOME';

INSERT INTO
    venue_seats (
        venue_id,
        section_name,
        seat_number,
        seat_label,
        price,
        position_x,
        position_y,
        created_at
    )
SELECT
    venue.id,
    ELT(
        zones.zone_index + 1,
        'A구역',
        'B구역',
        'C구역',
        'D구역',
        'E구역',
        'F구역',
        'G구역',
        'H구역',
        'I구역',
        'J구역'
    ),
    seat_rows.row_index * 15 + seat_columns.column_index + 1,
    CONCAT(
        ELT(
            zones.zone_index + 1,
            'A구역',
            'B구역',
            'C구역',
            'D구역',
            'E구역',
            'F구역',
            'G구역',
            'H구역',
            'I구역',
            'J구역'
        ),
        ' ',
        seat_rows.row_index + 1,
        '열 ',
        seat_columns.column_index + 1,
        '번'
    ),
    CASE
        WHEN zones.zone_index < 5 THEN 150000
        ELSE 110000
    END,
    90 + MOD(zones.zone_index, 5) * 300 + seat_columns.column_index * 16,
    CASE
        WHEN zones.zone_index < 5 THEN 260
        ELSE 570
    END + seat_rows.row_index * 18,
    CURRENT_TIMESTAMP
FROM
    venues venue
    CROSS JOIN (
        SELECT 0 AS zone_index
        UNION ALL
        SELECT 1
        UNION ALL
        SELECT 2
        UNION ALL
        SELECT 3
        UNION ALL
        SELECT 4
        UNION ALL
        SELECT 5
        UNION ALL
        SELECT 6
        UNION ALL
        SELECT 7
        UNION ALL
        SELECT 8
        UNION ALL
        SELECT 9
    ) zones
    CROSS JOIN (
        SELECT 0 AS row_index
        UNION ALL
        SELECT 1
        UNION ALL
        SELECT 2
        UNION ALL
        SELECT 3
        UNION ALL
        SELECT 4
        UNION ALL
        SELECT 5
        UNION ALL
        SELECT 6
        UNION ALL
        SELECT 7
        UNION ALL
        SELECT 8
        UNION ALL
        SELECT 9
    ) seat_rows
    CROSS JOIN (
        SELECT 0 AS column_index
        UNION ALL
        SELECT 1
        UNION ALL
        SELECT 2
        UNION ALL
        SELECT 3
        UNION ALL
        SELECT 4
        UNION ALL
        SELECT 5
        UNION ALL
        SELECT 6
        UNION ALL
        SELECT 7
        UNION ALL
        SELECT 8
        UNION ALL
        SELECT 9
        UNION ALL
        SELECT 10
        UNION ALL
        SELECT 11
        UNION ALL
        SELECT 12
        UNION ALL
        SELECT 13
        UNION ALL
        SELECT 14
    ) seat_columns
WHERE
    venue.name = '올림픽공원 KSPO DOME';
