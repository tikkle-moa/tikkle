import type { ConcertGenre, CreateConcertRequest } from "@entities/concert";

export const CONCERT_FORM_LIMITS = {
  title: 100,
  posterUrl: 400,
  description: 10_000,
} as const;

export const EMPTY_CONCERT_FORM_VALUES: CreateConcertRequest = {
  venueId: 0,
  title: "",
  genre: "" as ConcertGenre,
  posterUrl: null,
  description: null,
};
