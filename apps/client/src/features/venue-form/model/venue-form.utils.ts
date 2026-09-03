import { toRound } from "@shared/lib/number.utils";

import { type CreateVenueRequest, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "@entities/venue";

import { BASIC_ERROR_KEYS, LAYOUT_ERROR_KEYS, VENUE_FORM_LIMITS } from "./venue-form.constants";
import type { VenueFormErrors, VenueFormSeat } from "./venue-form.types";
import { getVenueSeatCollisionMap } from "./venue-seat-collision.utils";

const getVenueSeatCollisionError = (seatByClientId: Map<number, VenueFormSeat>, collidingClientIds: Set<number>) => {
  const seatNames = [...collidingClientIds].map((clientId) => {
    if (clientId === -1) return "무대";
    return seatByClientId.get(clientId)?.seatLabel.trim() || `좌석 ${clientId}`;
  });
  return `같은 좌표에 중복된 영역이 있습니다.\n겹치는 영역: ${seatNames.join(", ")}`;
};

const validateStagePosition = (
  venueWidth: number,
  venueHeight: number,
  stagePositionX: number,
  stagePositionY: number,
  stageWidth: number,
  stageHeight: number,
) => {
  const leftTopX = stagePositionX - stageWidth / 2;
  const leftTopY = stagePositionY - stageHeight / 2;
  const rightBottomX = stagePositionX + stageWidth / 2;
  const rightBottomY = stagePositionY + stageHeight / 2;

  if (leftTopX < 0 || leftTopY < 0 || rightBottomX > venueWidth || rightBottomY > venueHeight) {
    return false;
  }
  return true;
};

export const validateVenueForm = (venue: CreateVenueRequest, venueSeats: VenueFormSeat[]): VenueFormErrors => {
  const errors: VenueFormErrors = {};

  if (!venue.name.trim()) errors.name = "공연장 이름을 입력해 주세요.";
  else if (venue.name.trim().length > VENUE_FORM_LIMITS.venueName)
    errors.name = `공연장 이름은 ${VENUE_FORM_LIMITS.venueName}자 이내로 입력해 주세요.`;

  if (!venue.address.trim()) errors.address = "주소를 입력해 주세요.";
  else if (venue.address.trim().length > VENUE_FORM_LIMITS.venueAddress)
    errors.address = `주소는 ${VENUE_FORM_LIMITS.venueAddress}자 이내로 입력해 주세요.`;

  if (venue.description && venue.description.trim().length > VENUE_FORM_LIMITS.venueDescription)
    errors.description = `설명은 ${VENUE_FORM_LIMITS.venueDescription}자 이내로 입력해 주세요.`;

  (["width", "height", "stagePositionX", "stagePositionY"] as const).forEach((field) => {
    if (!Number.isFinite(venue[field]) || venue[field] < 0 || venue[field] > 999_999.99)
      errors[field] = "0 이상 999,999.99 이하의 숫자를 입력해 주세요.";
  });

  (["stageWidth", "stageHeight"] as const).forEach((field) => {
    if (!Number.isFinite(venue[field]) || venue[field] < 0 || venue[field] > 999.99) errors[field] = "0 이상 999.99 이하의 숫자를 입력해 주세요.";
  });

  if (
    !errors.width &&
    !errors.height &&
    !errors.stagePositionX &&
    !errors.stagePositionY &&
    !errors.stageWidth &&
    !errors.stageHeight &&
    !validateStagePosition(venue.width, venue.height, venue.stagePositionX, venue.stagePositionY, venue.stageWidth, venue.stageHeight)
  ) {
    errors.stageWidth = "무대가 공연장 범위를 벗어납니다.";
  }

  if (venueSeats.length === 0) errors.venueSeats = "좌석을 하나 이상 추가해 주세요.";

  const seatKeys = new Set<string>();
  venueSeats.forEach((seat) => {
    const prefix = `seat.${seat.clientId}`;
    if (!seat.sectionName.trim()) errors[`${prefix}.sectionName`] = "구역명을 입력해 주세요.";
    else if (seat.sectionName.trim().length > VENUE_FORM_LIMITS.venueSeatSection)
      errors[`${prefix}.sectionName`] = `구역명은 ${VENUE_FORM_LIMITS.venueSeatSection}자 이내로 입력해 주세요.`;

    if (!Number.isInteger(seat.seatNumber) || seat.seatNumber <= 0) errors[`${prefix}.seatNumber`] = "좌석번호는 1 이상의 정수를 입력해 주세요.";

    if (!seat.seatLabel.trim()) errors[`${prefix}.seatLabel`] = "좌석 표시를 입력해 주세요.";
    else if (seat.seatLabel.trim().length > VENUE_FORM_LIMITS.venueSeatLabel)
      errors[`${prefix}.seatLabel`] = `좌석 표시는 ${VENUE_FORM_LIMITS.venueSeatLabel}자 이내로 입력해 주세요.`;

    if (!Number.isInteger(seat.price) || seat.price < 0) errors[`${prefix}.price`] = "좌석 가격은 0 이상의 정수를 입력해 주세요.";

    if (
      !Number.isFinite(seat.positionX) ||
      seat.positionX < VENUE_SEAT_WIDTH / 2 ||
      seat.positionX > (errors.width ? 999_999.99 : venue.width - VENUE_SEAT_WIDTH / 2)
    )
      errors[`${prefix}.positionX`] = `X 좌표는 ${VENUE_SEAT_WIDTH / 2} 이상 ${venue.width - VENUE_SEAT_WIDTH / 2} 이하의 숫자를 입력해 주세요.`;

    if (
      !Number.isFinite(seat.positionY) ||
      seat.positionY < VENUE_SEAT_HEIGHT / 2 ||
      seat.positionY > (errors.height ? 999_999.99 : venue.height - VENUE_SEAT_HEIGHT / 2)
    )
      errors[`${prefix}.positionY`] = `Y 좌표는 ${VENUE_SEAT_HEIGHT / 2} 이상 ${venue.height - VENUE_SEAT_HEIGHT / 2} 이하의 숫자를 입력해 주세요.`;

    const key = `${seat.sectionName.trim()}\u0000${seat.seatNumber}`;
    if (seatKeys.has(key)) errors[`${prefix}.seatNumber`] = "같은 구역에 중복된 좌석 번호가 있습니다.";
    seatKeys.add(key);
  });

  const seatByClientId = new Map(venueSeats.map((seat) => [seat.clientId, seat]));
  getVenueSeatCollisionMap(venue, venueSeats).forEach((collidingClientIds, clientId) => {
    const collisionError = getVenueSeatCollisionError(seatByClientId, collidingClientIds);
    errors[`seat.${clientId}.positionX`] = collisionError;
    errors[`seat.${clientId}.positionY`] = collisionError;
  });

  return errors;
};

export const replaceVenueSeatCollisionErrors = (
  errors: VenueFormErrors,
  venueSeats: VenueFormSeat[],
  collisionMap: Map<number, Set<number>>,
): VenueFormErrors => {
  const nextErrors = Object.fromEntries(
    Object.entries(errors).filter(([key]) => !key.startsWith("seat.") || (!key.endsWith(".positionX") && !key.endsWith(".positionY"))),
  ) as VenueFormErrors;
  const seatByClientId = new Map(venueSeats.map((seat) => [seat.clientId, seat]));

  collisionMap.forEach((collidingIndices, index) => {
    const collisionError = getVenueSeatCollisionError(seatByClientId, collidingIndices);
    nextErrors[`seat.${index}.positionX`] = collisionError;
    nextErrors[`seat.${index}.positionY`] = collisionError;
  });

  return nextErrors;
};

export const toCreateVenueRequest = (venue: CreateVenueRequest): CreateVenueRequest => ({
  name: venue.name.trim(),
  address: venue.address.trim(),
  description: venue.description?.trim() || null,
  width: toRound(venue.width, 2),
  height: toRound(venue.height, 2),
  stagePositionX: toRound(venue.stagePositionX, 2),
  stagePositionY: toRound(venue.stagePositionY, 2),
  stageWidth: toRound(venue.stageWidth, 2),
  stageHeight: toRound(venue.stageHeight, 2),
});

export const toCreateVenueSeatRequest = (venueSeats: VenueFormSeat[]): VenueFormSeat[] =>
  venueSeats.map((seat) => ({
    clientId: seat.clientId,
    sectionName: seat.sectionName.trim(),
    seatNumber: toRound(seat.seatNumber, 0),
    seatLabel: seat.seatLabel.trim(),
    price: toRound(seat.price, 0),
    positionX: toRound(seat.positionX, 2),
    positionY: toRound(seat.positionY, 2),
  }));

export const createVenueSeat = (venueWidth: number, venueHeight: number, clientId: number): VenueFormSeat => {
  const minX = VENUE_SEAT_WIDTH / 2;
  const minY = VENUE_SEAT_HEIGHT / 2;
  const maxX = Math.max(minX, venueWidth - VENUE_SEAT_WIDTH / 2);
  const maxY = Math.max(minY, venueHeight - VENUE_SEAT_HEIGHT / 2);

  return {
    clientId,
    sectionName: "",
    seatNumber: 1,
    seatLabel: "",
    price: 0,
    positionX: Math.round((minX + Math.random() * (maxX - minX)) * 100) / 100,
    positionY: Math.round((minY + Math.random() * (maxY - minY)) * 100) / 100,
  };
};

export const getVenueSeatClassName = (hasError: boolean, isSelected: boolean) => {
  if (hasError) return "border-red-300 bg-red-50 text-red-700";
  if (isSelected) return "border-violet-300 bg-violet-100 text-violet-700";
  return "border-slate-200 bg-white text-slate-600 hover:border-violet-200";
};

export const getErrorSections = (errorKeys: string[]): string[] => {
  const errorSections = new Set<string>();

  errorKeys.forEach((key) => {
    if (BASIC_ERROR_KEYS.has(key)) {
      errorSections.add("기본 정보");
    } else if (LAYOUT_ERROR_KEYS.has(key)) {
      errorSections.add("공연장 및 무대 크기");
    } else if (key === "venueSeats" || key.startsWith("seat.")) {
      errorSections.add("좌석 정보");
    } else {
      errorSections.add("기타");
    }
  });

  return [...errorSections];
};
