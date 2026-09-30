-- performances 테이블에 공연 회차 이름 컬럼 추가

ALTER TABLE performances
ADD COLUMN name VARCHAR(255) NULL AFTER concert_id;

UPDATE performances p
JOIN concerts c ON c.id = p.concert_id
SET p.name = c.title
WHERE p.name IS NULL;

ALTER TABLE performances
MODIFY COLUMN name VARCHAR(255) NOT NULL;
