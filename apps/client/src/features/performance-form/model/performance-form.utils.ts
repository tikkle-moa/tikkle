import { EMPTY_PERFORMANCE_FORM_VALUES } from "./performance-form.constants";
import type { PerformanceFormErrors, PerformanceFormValues } from "./performance-form.types";

export const getInitialPerformanceFormValues = (values?: Partial<PerformanceFormValues>): PerformanceFormValues => ({
  ...EMPTY_PERFORMANCE_FORM_VALUES,
  ...values,
});

export const validatePerformanceForm = (values: PerformanceFormValues): PerformanceFormErrors => {
  const errors: PerformanceFormErrors = {};

  if (!values.startsAt) {
    errors.startsAt = "공연 시작 시각을 입력해 주세요.";
    return errors;
  }

  if (!values.bookingOpensAt) {
    return errors;
  }

  if (new Date(values.bookingOpensAt) >= new Date(values.startsAt)) {
    errors.bookingOpensAt = "예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.";
  }

  return errors;
};
