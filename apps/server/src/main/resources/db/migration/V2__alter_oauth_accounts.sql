-- V2__alter_oauth_accounts.sql
-- oauth_accounts 테이블의 access_token, refresh_token, token_expires_at 컬럼 제거
-- provider_email 컬럼을 NOT NULL로 변경
-- provider 컬럼을 ENUM('KAKAO', 'GOOGLE', 'NAVER', 'GITHUB')로 변경

ALTER TABLE oauth_accounts
DROP COLUMN access_token,
DROP COLUMN refresh_token,
DROP COLUMN token_expires_at,
MODIFY COLUMN provider_email VARCHAR(255) NOT NULL,
MODIFY COLUMN provider ENUM(
    'KAKAO',
    'GOOGLE',
    'NAVER',
    'GITHUB'
) NOT NULL,
ADD CONSTRAINT uq_oauth_user_provider UNIQUE (user_id, provider);