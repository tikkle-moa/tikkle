export interface PerformanceFormValues {
  name: string;
  startsAt: string;
  bookingOpensAt: string;
}

export type PerformanceFormErrors = Partial<Record<keyof PerformanceFormValues, string>>;
