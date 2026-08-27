export interface PerformanceFormValues {
  name: string;
  startsAt: string;
  bookingOpensAt: string;
}

export type PerformanceSubmitState = { status: "idle" } | { status: "submitting" } | { status: "error"; error: string };
export type PerformanceFormErrors = Partial<Record<keyof PerformanceFormValues, string>>;
