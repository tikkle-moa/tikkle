import type { PerformanceResponse } from "@entities/performance";

import { EMPTY_PERFORMANCE_FORM_VALUES } from "./performance-form.constants";
import type { PerformanceFormErrors, PerformanceFormValues } from "./performance-form.types";

export const getInitialPerformanceFormValues = (values?: Partial<PerformanceFormValues>): PerformanceFormValues => ({
  ...EMPTY_PERFORMANCE_FORM_VALUES,
  ...values,
});

export const toPerformanceFormValues = (performance: PerformanceResponse): PerformanceFormValues => ({
  name: performance.name,
  startsAt: performance.startsAt.slice(0, 16),
  bookingOpensAt: performance.bookingOpensAt?.slice(0, 16) ?? "",
});

export const validatePerformanceForm = (values: PerformanceFormValues): PerformanceFormErrors => {
  const errors: PerformanceFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "공연 회차명을 입력해 주세요.";
    return errors;
  }

  if (!values.startsAt) {
    errors.startsAt = "공연 시작 시각을 입력해 주세요.";
    return errors;
  }

  const startsAt = new Date(values.startsAt);

  if (startsAt <= new Date()) {
    errors.startsAt = "공연 시작 시각은 현재 이후여야 합니다.";
  }

  if (!values.bookingOpensAt) {
    return errors;
  }

  const bookingOpensAt = new Date(values.bookingOpensAt);

  if (bookingOpensAt <= new Date()) {
    errors.bookingOpensAt = "예매 시작 시각은 현재 이후여야 합니다.";
  } else if (bookingOpensAt >= startsAt) {
    errors.bookingOpensAt = "예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.";
  }

  return errors;
};
