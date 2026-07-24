-- V1__init_schema.sql
-- ERD 기반 초기 테이블 생성
-- Flyway는 이 파일을 한 번만 실행하고 flyway_schema_history 테이블에 기록합니다.

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    nickname VARCHAR(50) NOT NULL,
    profile_image_url VARCHAR(500),
    role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_oauth_provider UNIQUE (provider, provider_user_id),
    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS concerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    poster_url VARCHAR(500),
    description TEXT,
    created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS performances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    concert_id BIGINT NOT NULL,
    starts_at DATETIME NOT NULL,
    booking_opens_at DATETIME,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_perf UNIQUE (concert_id, starts_at),
    CONSTRAINT fk_perf_concert FOREIGN KEY (concert_id) REFERENCES concerts (id)
);

CREATE TABLE IF NOT EXISTS seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    performance_id BIGINT NOT NULL,
    section_name VARCHAR(50) NOT NULL,
    seat_number INT NOT NULL,
    seat_label VARCHAR(50) NOT NULL,
    price INT NOT NULL,
    position_x DECIMAL(8, 2) NOT NULL,
    position_y DECIMAL(8, 2) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_seat UNIQUE (
        performance_id,
        section_name,
        seat_number
    ),
    CONSTRAINT fk_seat_perf FOREIGN KEY (performance_id) REFERENCES performances (id)
);

CREATE TABLE IF NOT EXISTS reservations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    performance_id BIGINT NOT NULL,
    booker_user_id BIGINT NOT NULL,
    status ENUM(
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'EXPIRED'
    ) NOT NULL,
    payment_reference VARCHAR(255),
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_res_perf FOREIGN KEY (performance_id) REFERENCES performances (id),
    CONSTRAINT fk_res_user FOREIGN KEY (booker_user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS reservation_seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_res_seat UNIQUE (reservation_id, seat_id),
    CONSTRAINT uq_seat_reserved UNIQUE (seat_id),
    CONSTRAINT fk_res_seat_res FOREIGN KEY (reservation_id) REFERENCES reservations (id),
    CONSTRAINT fk_res_seat_seat FOREIGN KEY (seat_id) REFERENCES seats (id)
);

CREATE TABLE IF NOT EXISTS reservation_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_res_user UNIQUE (reservation_id, user_id),
    CONSTRAINT fk_res_user_res FOREIGN KEY (reservation_id) REFERENCES reservations (id),
    CONSTRAINT fk_res_user_user FOREIGN KEY (user_id) REFERENCES users (id)
);