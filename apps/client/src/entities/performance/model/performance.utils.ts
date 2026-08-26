import { formatDate, toDate } from "@shared/lib/date.utils";

import type { PerformanceResponse, PerformanceStatus } from "./performance.types";

export const getPeriod = (performances: PerformanceResponse[]): string => {
  if (performances.length === 0) {
    return "";
  }

  const firstPerformance = performances.reduce((earliest, current) => (toDate(current.startsAt) < toDate(earliest.startsAt) ? current : earliest));
  const lastPerformance = performances.reduce((latest, current) => (toDate(current.startsAt) > toDate(latest.startsAt) ? current : latest));

  return `${formatDate(firstPerformance.startsAt)} ~ ${formatDate(lastPerformance.startsAt)}`;
};

export const getPerformanceStatus = (performance: PerformanceResponse): PerformanceStatus => {
  const now = new Date();
  const startsAt = toDate(performance.startsAt);
  if (startsAt < now) {
    return "ended";
  }

  const bookingOpensAt = performance.bookingOpensAt ? toDate(performance.bookingOpensAt) : null;
  const isBookingPending = bookingOpensAt !== null && bookingOpensAt > now;
  if (isBookingPending) {
    return "upcoming";
  }

  return "available";
};
