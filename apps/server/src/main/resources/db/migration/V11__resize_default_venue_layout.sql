-- 고정 좌석 크기 4.5 × 3.5가 배치도에서 적절히 보이도록 기본 공연장을 축소한다.
-- 가상 캔버스는 670 × 380이며 각 구역은 15열 × 10행, 150석이다.
-- 좌석 간격은 가로 7, 세로 8로 좌석의 논리 영역이 서로 겹치지 않는다.

SET @default_venue_id = 1;

UPDATE venues
SET
    width = 670.00,
    height = 380.00,
    stage_position_x = 335.00,
    stage_position_y = 40.00,
    stage_width = 176.00,
    stage_height = 24.00
WHERE
    id = @default_venue_id;

UPDATE venue_seats seat
    INNER JOIN (
        SELECT 'A구역' AS section_name, 0 AS zone_index
        UNION ALL
        SELECT 'B구역', 1
        UNION ALL
        SELECT 'C구역', 2
        UNION ALL
        SELECT 'D구역', 3
        UNION ALL
        SELECT 'E구역', 4
        UNION ALL
        SELECT 'F구역', 5
        UNION ALL
        SELECT 'G구역', 6
        UNION ALL
        SELECT 'H구역', 7
        UNION ALL
        SELECT 'I구역', 8
        UNION ALL
        SELECT 'J구역', 9
    ) zones ON zones.section_name = seat.section_name
SET
    seat.position_x = 40 + MOD(zones.zone_index, 5) * 125 + MOD(seat.seat_number - 1, 15) * 7,
    seat.position_y = CASE
        WHEN zones.zone_index < 5 THEN 110
        ELSE 240
    END + FLOOR((seat.seat_number - 1) / 15) * 8
WHERE
    seat.venue_id = @default_venue_id
    AND seat.seat_number BETWEEN 1 AND 150;
