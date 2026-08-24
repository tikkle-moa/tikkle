import { formatDate, toDate } from "@shared/lib/date.utils";

import type { BookingStatus, PerformanceResponse } from "./concert.types";

export const getBookingStatus = (performances: PerformanceResponse[]): BookingStatus => {
  const now = new Date();
  const futurePerformances = performances.filter(({ startsAt }) => toDate(startsAt) >= now);

  if (futurePerformances.length === 0) return "ended";
  if (futurePerformances.every(({ bookingOpensAt }) => bookingOpensAt && toDate(bookingOpensAt) > now)) return "upcoming";

  return "available";
};

export const getPeriod = (performances: PerformanceResponse[]) => {
  if (performances.length === 0) {
    return "";
  }

  const firstPerformance = performances.reduce((earliest, current) => (toDate(current.startsAt) < toDate(earliest.startsAt) ? current : earliest));
  const lastPerformance = performances.reduce((latest, current) => (toDate(current.startsAt) > toDate(latest.startsAt) ? current : latest));

  return `${formatDate(firstPerformance.startsAt)} ~ ${formatDate(lastPerformance.startsAt)}`;
};
