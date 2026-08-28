-- 중심점 기준 무대 좌표가 공연장 위쪽 경계를 벗어나지 않도록 기본 공연장 데이터를 보정한다.

UPDATE venues
SET
    stage_position_y = 10
WHERE
    name = '올림픽공원 KSPO DOME'
