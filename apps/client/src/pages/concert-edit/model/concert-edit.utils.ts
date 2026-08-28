import type { ConcertResponse, CreateConcertRequest, UpdateConcertRequest } from "@entities/concert";

export const toUpdateConcertRequest = (values: CreateConcertRequest, initialValues: ConcertResponse): UpdateConcertRequest => {
  const updateRequest: UpdateConcertRequest = {
    title: values.title,
    genre: values.genre,
    posterUrl: values.posterUrl,
    description: values.description,
  };
  return Object.fromEntries(
    Object.entries(updateRequest).filter(([key, value]) => value !== initialValues[key as keyof UpdateConcertRequest]),
  ) as UpdateConcertRequest;
};
