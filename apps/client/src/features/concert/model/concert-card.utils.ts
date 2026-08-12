import type { BookingStatus, ConcertResponse, PerformanceResponse } from "@entities/concert";

export const getBookingStatus = (concert: ConcertResponse): BookingStatus => {
  const { performances } = concert;

  const now = new Date();
  if (performances.every(({ startsAt }) => startsAt < now)) return "ended";
  if (performances.every(({ bookingOpensAt }) => bookingOpensAt && bookingOpensAt > now)) return "upcoming";
  if (performances.every(({ bookedSeats, totalSeats }) => bookedSeats === totalSeats)) return "soldout";

  return "available";
};

export const getPeriod = (performances: PerformanceResponse[]) => {
  if (performances.length === 0) return "";

  const firstPerformance = performances.reduce((earliest, current) => (current.startsAt < earliest.startsAt ? current : earliest));
  const lastPerformance = performances.reduce((latest, current) => (current.startsAt > latest.startsAt ? current : latest));

  return `${firstPerformance.startsAt.toLocaleDateString()} ~ ${lastPerformance.startsAt.toLocaleDateString()}`;
};
