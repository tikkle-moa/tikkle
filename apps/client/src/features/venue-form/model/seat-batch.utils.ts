import type { CreateVenueSeatRequest } from "@entities/venue";

import type { SeatBatchValues } from "./seat-batch.types";
import { VENUE_FORM_LIMITS } from "./venue-form.constants";

export const validateSeatBatch = (values: SeatBatchValues, existingVenueSeats: CreateVenueSeatRequest[], venueWidth: number, venueHeight: number) => {
  if (!values.sectionName.trim()) return "구역명을 입력해 주세요.";
  if (values.sectionName.trim().length > VENUE_FORM_LIMITS.venueSeatSection) return "구역명은 50자 이하로 입력해 주세요.";

  if (!Number.isInteger(values.rows) || values.rows < 1) return "행은 1 이상의 정수여야 합니다.";
  if (!Number.isInteger(values.columns) || values.columns < 1) return "열은 1 이상의 정수여야 합니다.";
  if (values.rows * values.columns > VENUE_FORM_LIMITS.venueSeatBatchSize)
    return `한 번에 최대 ${VENUE_FORM_LIMITS.venueSeatBatchSize}석까지 생성할 수 있습니다.`;

  if (!Number.isInteger(values.startSeatNumber) || values.startSeatNumber < 1) return "시작 번호는 1 이상의 정수여야 합니다.";
  if (!Number.isInteger(values.price) || values.price < 0) return "가격은 0 이상의 정수여야 합니다.";
  if (values.gapX <= 0 || values.gapY <= 0) return "좌석 간격은 0보다 커야 합니다.";

  const lastX = values.startX + (values.columns - 1) * values.gapX;
  const lastY = values.startY + (values.rows - 1) * values.gapY;
  if (values.startX < 0 || values.startY < 0 || lastX > venueWidth || lastY > venueHeight) return "생성될 좌석이 공연장 범위를 벗어납니다.";

  const existingVenueSeatKeys = new Set(existingVenueSeats.map((seat) => `${seat.sectionName.trim()}\u0000${seat.seatNumber}`));
  const hasDuplicateVenueSeat = Array.from(
    { length: values.rows * values.columns },
    (_, index) => `${values.sectionName.trim()}\u0000${values.startSeatNumber + index}`,
  ).some((venueSeatKey) => existingVenueSeatKeys.has(venueSeatKey));
  if (hasDuplicateVenueSeat) return "같은 구역에 중복된 좌석 번호가 있습니다.";

  return null;
};

export const createSeatBatch = (values: SeatBatchValues): CreateVenueSeatRequest[] => {
  const venueSeats = Array.from({ length: values.rows * values.columns }, (_, index) => {
    const row = Math.floor(index / values.columns);
    const column = index % values.columns;
    const seatNumber = values.startSeatNumber + index;
    return {
      sectionName: values.sectionName.trim(),
      seatNumber,
      seatLabel: `${values.sectionName.trim()} ${seatNumber}번`,
      price: values.price,
      positionX: values.startX + column * values.gapX,
      positionY: values.startY + row * values.gapY,
    };
  });

  return venueSeats;
};
