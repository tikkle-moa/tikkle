import { BOOKING_STATUS_MAP, type ConcertResponse } from "@entities/concert";

import { getBookingStatus, getPeriod } from "./concert-card.utils";

interface UseConcertCardProps {
  concert: ConcertResponse;
}

export const useConcertCard = ({ concert }: UseConcertCardProps) => {
  const { posterUrl, title, placeName, performances } = concert;

  const period = getPeriod(performances);

  const bookingStatus = getBookingStatus(concert);
  const { label: statusLabel, className: statusClassName } = BOOKING_STATUS_MAP[bookingStatus];

  return {
    posterUrl,
    title,
    placeName,
    period,
    statusLabel,
    statusClassName,
  };
};
