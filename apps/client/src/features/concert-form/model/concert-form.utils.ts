import type { CreateConcertRequest } from "@entities/concert";

import { CONCERT_FORM_LIMITS, EMPTY_CONCERT_FORM_VALUES } from "./concert-form.constants";
import type { ConcertFormErrors } from "./concert-form.types";

export const getInitialConcertFormValues = (values?: Partial<CreateConcertRequest>): CreateConcertRequest => ({
  ...EMPTY_CONCERT_FORM_VALUES,
  ...values,
});

export const validateConcertForm = (values: CreateConcertRequest, posterLoadFailed = false): ConcertFormErrors => {
  const errors: ConcertFormErrors = {};

  const title = values.title.trim();
  const posterUrl = values.posterUrl?.trim() ?? "";
  const description = values.description?.trim() ?? "";

  if (!title) {
    errors.title = "콘서트 제목을 입력해 주세요.";
  } else if (title.length > CONCERT_FORM_LIMITS.title) {
    errors.title = `콘서트 제목은 ${CONCERT_FORM_LIMITS.title}자 이하로 입력해 주세요.`;
  }

  if (values.venueId <= 0) {
    errors.venueId = "공연장을 선택해 주세요.";
  }

  if (!values.genre) {
    errors.genre = "장르를 선택해 주세요.";
  }

  if (posterUrl.length > CONCERT_FORM_LIMITS.posterUrl) {
    errors.posterUrl = `포스터 URL은 ${CONCERT_FORM_LIMITS.posterUrl}자 이하로 입력해 주세요.`;
  } else if (posterUrl) {
    if (posterLoadFailed) {
      errors.posterUrl = "포스터를 불러오는 데 실패했습니다.";
    }
    try {
      const url = new URL(posterUrl);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.posterUrl = "http 또는 https 형식의 올바른 URL을 입력해 주세요.";
      }
    } catch {
      errors.posterUrl = "http 또는 https 형식의 올바른 URL을 입력해 주세요.";
    }
  }

  if (description.length > CONCERT_FORM_LIMITS.description) {
    errors.description = `콘서트 설명은 ${CONCERT_FORM_LIMITS.description.toLocaleString()}자 이하로 입력해 주세요.`;
  }

  return errors;
};

export const toConcertRequest = (values: CreateConcertRequest): CreateConcertRequest => ({
  venueId: values.venueId,
  title: values.title.trim(),
  genre: values.genre,
  posterUrl: values.posterUrl?.trim() || null,
  description: values.description?.trim() || null,
});
