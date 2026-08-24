import { BOOKING_STATUS_MAP, CONCERT_GENRE_MAP } from "./concert.constants";
import type { ConcertResponse, PerformanceResponse } from "./concert.types";
import { getBookingStatus, getPeriod } from "./concert.utils";

interface UseConcertCardProps {
  concert: ConcertResponse;
  performances: PerformanceResponse[];
}

export const useConcertCard = ({ concert, performances }: UseConcertCardProps) => {
  const { posterUrl, title, placeName } = concert;

  const period = getPeriod(performances);

  const bookingStatus = getBookingStatus(performances);
  const { label: statusLabel, className: statusClassName } = BOOKING_STATUS_MAP[bookingStatus];

  const { icon: GenreIcon, label: genreLabel, className: genreClassName } = CONCERT_GENRE_MAP[concert.genre];

  return {
    posterUrl,
    title,
    placeName,
    period,
    statusLabel,
    statusClassName,
    GenreIcon,
    genreLabel,
    genreClassName,
  };
};
