import type { CreateVenueRequest, UpdateVenueDetailRequest, UpdateVenueRequest, UpdateVenueSeatRequest, VenueDetailResponse } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form";

export const toUpdateVenueRequest = (
  venue: CreateVenueRequest,
  venueSeats: VenueFormSeat[],
  initialValues: VenueDetailResponse,
): UpdateVenueDetailRequest => {
  const updatedVenue: UpdateVenueRequest = {};
  if (venue.name !== initialValues.venue.name) updatedVenue.name = venue.name;
  if (venue.address !== initialValues.venue.address) updatedVenue.address = venue.address;
  if (venue.description !== initialValues.venue.description) updatedVenue.description = venue.description;
  if (venue.width !== initialValues.venue.width) updatedVenue.width = venue.width;
  if (venue.height !== initialValues.venue.height) updatedVenue.height = venue.height;
  if (venue.stagePositionX !== initialValues.venue.stagePositionX) updatedVenue.stagePositionX = venue.stagePositionX;
  if (venue.stagePositionY !== initialValues.venue.stagePositionY) updatedVenue.stagePositionY = venue.stagePositionY;
  if (venue.stageWidth !== initialValues.venue.stageWidth) updatedVenue.stageWidth = venue.stageWidth;
  if (venue.stageHeight !== initialValues.venue.stageHeight) updatedVenue.stageHeight = venue.stageHeight;

  const initialVenueSeatMap = new Map(initialValues.venueSeats.map((seat) => [seat.id, seat]));

  const newVenueSeats: UpdateVenueSeatRequest[] = [];
  const updatedVenueSeats: UpdateVenueSeatRequest[] = [];

  venueSeats.forEach((seat) => {
    const initialSeat = initialVenueSeatMap.get(seat.clientId);

    if (!initialSeat) {
      newVenueSeats.push({
        sectionName: seat.sectionName,
        seatNumber: seat.seatNumber,
        seatLabel: seat.seatLabel,
        price: seat.price,
        positionX: seat.positionX,
        positionY: seat.positionY,
      });
      return;
    }

    if (
      initialSeat.sectionName !== seat.sectionName ||
      initialSeat.seatNumber !== seat.seatNumber ||
      initialSeat.seatLabel !== seat.seatLabel ||
      initialSeat.price !== seat.price ||
      initialSeat.positionX !== seat.positionX ||
      initialSeat.positionY !== seat.positionY
    ) {
      updatedVenueSeats.push({
        id: seat.clientId,
        sectionName: seat.sectionName,
        seatNumber: seat.seatNumber,
        seatLabel: seat.seatLabel,
        price: seat.price,
        positionX: seat.positionX,
        positionY: seat.positionY,
      });
    }
  });

  const venueSeatIds = new Set(venueSeats.map((seat) => seat.clientId));
  const deletedVenueSeatIds = [...initialVenueSeatMap.keys()].filter((id) => !venueSeatIds.has(id));

  const updateRequest: UpdateVenueDetailRequest = {};
  if (Object.keys(updatedVenue).length > 0) updateRequest.venue = updatedVenue;
  if (newVenueSeats.length > 0 || updatedVenueSeats.length > 0) updateRequest.venueSeats = [...newVenueSeats, ...updatedVenueSeats];
  if (deletedVenueSeatIds.length > 0) updateRequest.deletedVenueSeatIds = deletedVenueSeatIds;

  return updateRequest;
};
