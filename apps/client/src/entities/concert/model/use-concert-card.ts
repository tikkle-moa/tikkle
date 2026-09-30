import { CONCERT_GENRE_MAP } from "./concert.constants";
import type { ConcertListResponse } from "./concert.types";

interface UseConcertCardProps {
  concert: ConcertListResponse;
}

export const useConcertCard = ({ concert }: UseConcertCardProps) => {
  const { posterUrl, title, venueName } = concert;

  const { icon: GenreIcon, label: genreLabel, className: genreClassName } = CONCERT_GENRE_MAP[concert.genre];

  return {
    posterUrl,
    title,
    venueName,
    GenreIcon,
    genreLabel,
    genreClassName,
  };
};
