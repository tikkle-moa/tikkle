export interface PerformanceFormValues {
  startsAt: string;
  bookingOpensAt: string;
}

export type PerformanceFormErrors = Partial<Record<keyof PerformanceFormValues, string>>;
