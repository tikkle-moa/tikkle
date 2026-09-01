import { toRound } from "@shared/lib/number.utils";

import type { CreateVenueDetailRequest, CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { VENUE_FORM_LIMITS } from "./venue-form.constants";
import type { VenueFormErrors } from "./venue-form.types";

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

export const validateVenueForm = (venue: CreateVenueRequest, venueSeats: CreateVenueSeatRequest[]): VenueFormErrors => {
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
  venueSeats.forEach((seat, index) => {
    const prefix = `seat.${index}`;
    if (!seat.sectionName.trim()) errors[`${prefix}.sectionName`] = "구역명을 입력해 주세요.";
    else if (seat.sectionName.trim().length > VENUE_FORM_LIMITS.venueSeatSection)
      errors[`${prefix}.sectionName`] = `구역명은 ${VENUE_FORM_LIMITS.venueSeatSection}자 이내로 입력해 주세요.`;

    if (!Number.isInteger(seat.seatNumber) || seat.seatNumber <= 0) errors[`${prefix}.seatNumber`] = "좌석번호는 1 이상의 정수를 입력해 주세요.";

    if (!seat.seatLabel.trim()) errors[`${prefix}.seatLabel`] = "좌석 표시를 입력해 주세요.";
    else if (seat.seatLabel.trim().length > VENUE_FORM_LIMITS.venueSeatLabel)
      errors[`${prefix}.seatLabel`] = `좌석 표시는 ${VENUE_FORM_LIMITS.venueSeatLabel}자 이내로 입력해 주세요.`;

    if (!Number.isInteger(seat.price) || seat.price < 0) errors[`${prefix}.price`] = "좌석 가격은 0 이상의 정수를 입력해 주세요.";

    if (!Number.isFinite(seat.positionX) || seat.positionX < 0 || seat.positionX > (errors.width ? 999_999.99 : venue.width))
      errors[`${prefix}.positionX`] = "X 좌표는 0 이상 공연장 가로 길이 이하의 숫자를 입력해 주세요.";

    if (!Number.isFinite(seat.positionY) || seat.positionY < 0 || seat.positionY > (errors.height ? 999_999.99 : venue.height))
      errors[`${prefix}.positionY`] = "Y 좌표는 0 이상 공연장 세로 길이 이하의 숫자를 입력해 주세요.";

    const key = `${seat.sectionName.trim()}\u0000${seat.seatNumber}`;
    if (seatKeys.has(key)) errors[`${prefix}.seatNumber`] = "같은 구역에 중복된 좌석 번호가 있습니다.";
    seatKeys.add(key);
  });
  return errors;
};

export const toCreateVenueRequest = (venue: CreateVenueRequest, venueSeats: CreateVenueSeatRequest[]): CreateVenueDetailRequest => ({
  venue: {
    name: venue.name.trim(),
    address: venue.address.trim(),
    description: venue.description === null ? null : venue.description.trim(),
    width: toRound(venue.width, 2),
    height: toRound(venue.height, 2),
    stagePositionX: toRound(venue.stagePositionX, 2),
    stagePositionY: toRound(venue.stagePositionY, 2),
    stageWidth: toRound(venue.stageWidth, 2),
    stageHeight: toRound(venue.stageHeight, 2),
  },
  venueSeats: venueSeats.map((seat) => ({
    sectionName: seat.sectionName.trim(),
    seatNumber: toRound(seat.seatNumber, 0),
    seatLabel: seat.seatLabel.trim(),
    price: toRound(seat.price, 0),
    positionX: toRound(seat.positionX, 2),
    positionY: toRound(seat.positionY, 2),
  })),
});

export const createVenueSeat = (venueWidth: number, venueHeight: number): CreateVenueSeatRequest => ({
  sectionName: "",
  seatNumber: 0,
  seatLabel: "",
  price: 0,
  positionX: Math.round(Math.random() * venueWidth * 100) / 100,
  positionY: Math.round(Math.random() * venueHeight * 100) / 100,
});
