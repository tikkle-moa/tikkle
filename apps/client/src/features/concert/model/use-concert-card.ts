import { BOOKING_STATUS_MAP, CONCERT_GENRE_MAP, type ConcertResponse, getBookingStatus, getPeriod } from "@entities/concert";

interface UseConcertCardProps {
  concert: ConcertResponse;
}

export const useConcertCard = ({ concert }: UseConcertCardProps) => {
  const { posterUrl, title, placeName, performances } = concert;

  const period = getPeriod(performances);

  const bookingStatus = getBookingStatus(concert);
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
