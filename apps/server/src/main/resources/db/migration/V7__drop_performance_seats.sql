-- 공연별 좌석 모델을 공연장 좌석 모델로 대체
-- 기존 seat_id는 venue_seat_id와 대응 관계가 없으므로 예약 좌석 테이블을 재생성한다.

DROP TABLE reservation_seats;

CREATE TABLE reservation_seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    performance_id BIGINT NOT NULL,
    venue_seat_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_reservation_performance_venue_seat
        UNIQUE (performance_id, venue_seat_id),
    CONSTRAINT uq_reservation_venue_seat
        UNIQUE (reservation_id, venue_seat_id),
    CONSTRAINT fk_reservation_seat_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations (id),
    CONSTRAINT fk_reservation_seat_performance
        FOREIGN KEY (performance_id) REFERENCES performances (id),
    CONSTRAINT fk_reservation_seat_venue_seat
        FOREIGN KEY (venue_seat_id) REFERENCES venue_seats (id)
);

DROP TABLE reservation_users;

DROP TABLE seats;
