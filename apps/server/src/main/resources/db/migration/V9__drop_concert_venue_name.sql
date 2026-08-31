-- 공연장명은 venues 테이블을 원천으로 사용하므로, 중복 저장하던 콘서트 공연장명 컬럼을 제거한다.

ALTER TABLE concerts DROP COLUMN venue_name;
