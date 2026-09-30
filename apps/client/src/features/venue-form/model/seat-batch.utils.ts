import type { RefObject } from "react";

import { toRound } from "@shared/lib/number.utils";

import { type CreateVenueRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import type { SeatBatchValues } from "./seat-batch.types";
import { VENUE_FORM_LIMITS } from "./venue-form.constants";
import type { VenueFormSeat } from "./venue-form.types";
import type { BoundingBox } from "./venue-seat-collision.types";
import { createVenueSeatGrid, doVenueSeatsOverlap, getNearbyVenueSeats } from "./venue-seat-collision.utils";

const getVenueSeatKey = (sectionName: string, seatNumber: number) => `${sectionName.trim()}\u0000${seatNumber}`;

export const validateSeatBatch = (
  values: SeatBatchValues,
  existingVenue: CreateVenueRequest,
  existingVenueSeats: VenueFormSeat[],
  venueWidth: number,
  venueHeight: number,
) => {
  if (!values.sectionName.trim()) return "구역명을 입력해 주세요.";
  if (values.sectionName.trim().length > VENUE_FORM_LIMITS.venueSeatSection) return "구역명은 50자 이하로 입력해 주세요.";

  if (!Number.isInteger(values.rows) || values.rows < 1) return "행은 1 이상의 정수여야 합니다.";
  if (!Number.isInteger(values.columns) || values.columns < 1) return "열은 1 이상의 정수여야 합니다.";
  if (values.rows * values.columns > VENUE_FORM_LIMITS.venueSeatBatchSize)
    return `한 번에 최대 ${VENUE_FORM_LIMITS.venueSeatBatchSize}석까지 생성할 수 있습니다.`;

  if (!Number.isInteger(values.startSeatNumber) || values.startSeatNumber < 1) return "시작 번호는 1 이상의 정수여야 합니다.";
  if (!Number.isInteger(values.price) || values.price < 0) return "가격은 0 이상의 정수여야 합니다.";
  if (values.gapX <= VENUE_SEAT_WIDTH || values.gapY <= VENUE_SEAT_HEIGHT) return "좌석 간격은 좌석 크기보다 커야 합니다.";

  const lastX = values.startX + (values.columns - 1) * values.gapX;
  const lastY = values.startY + (values.rows - 1) * values.gapY;
  if (
    values.startX < VENUE_SEAT_WIDTH / 2 ||
    values.startY < VENUE_SEAT_HEIGHT / 2 ||
    lastX > venueWidth - VENUE_SEAT_WIDTH / 2 ||
    lastY > venueHeight - VENUE_SEAT_HEIGHT / 2
  )
    return "생성될 좌석이 공연장 범위를 벗어납니다.";

  const venueStageBoundingBox: BoundingBox = {
    positionX: existingVenue.stagePositionX,
    positionY: existingVenue.stagePositionY,
    width: existingVenue.stageWidth,
    height: existingVenue.stageHeight,
  };
  const existingSeatKeys = new Set(existingVenueSeats.map(({ sectionName, seatNumber }) => getVenueSeatKey(sectionName, seatNumber)));
  const existingSeatGrid = createVenueSeatGrid(existingVenueSeats);
  const sectionName = values.sectionName.trim();

  for (let index = 0; index < values.rows * values.columns; index += 1) {
    const generatedSeatBoundingBox: BoundingBox = {
      positionX: toRound(values.startX + (index % values.columns) * values.gapX, 2),
      positionY: toRound(values.startY + Math.floor(index / values.columns) * values.gapY, 2),
    };
    const seatKey = getVenueSeatKey(sectionName, values.startSeatNumber + index);
    if (existingSeatKeys.has(seatKey)) return "같은 구역에 중복된 좌석 번호가 있습니다.";

    if (getNearbyVenueSeats(generatedSeatBoundingBox, existingSeatGrid, (nearbySeat) => doVenueSeatsOverlap(nearbySeat, generatedSeatBoundingBox)))
      return "생성될 좌석 영역이 다른 좌석과 겹칩니다.";

    if (doVenueSeatsOverlap(generatedSeatBoundingBox, venueStageBoundingBox)) return "생성될 좌석 영역이 무대와 겹칩니다.";
  }

  return null;
};

export const createSeatBatch = (values: SeatBatchValues, venueSeatClientIdRef: RefObject<number>): VenueFormSeat[] => {
  const venueSeats = Array.from({ length: values.rows * values.columns }, (_, index) => {
    const row = Math.floor(index / values.columns);
    const column = index % values.columns;
    const seatNumber = values.startSeatNumber + index;
    return {
      clientId: venueSeatClientIdRef.current++,
      sectionName: values.sectionName.trim(),
      seatNumber,
      seatLabel: `${values.sectionName.trim()} ${seatNumber}번`,
      price: values.price,
      positionX: toRound(values.startX + column * values.gapX, 2),
      positionY: toRound(values.startY + row * values.gapY, 2),
    };
  });

  return venueSeats;
};
