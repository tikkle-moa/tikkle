-- V3__alter_concerts.sql
-- concerts 테이블에 콘서트 장르 컬럼 추가

ALTER TABLE concerts
ADD COLUMN genre ENUM(
    'BALLAD',
    'ROCK_METAL',
    'RAP_HIPHOP',
    'JAZZ_SOUL',
    'TROT',
    'INTERNATIONAL_ARTIST',
    'FESTIVAL',
    'INDIE'
) NOT NULL AFTER title;
