import type { BookingStatus, ConcertResponse, PerformanceResponse } from "@entities/concert";

export const getBookingStatus = (concert: ConcertResponse): BookingStatus => {
  const { performances } = concert;

  const now = new Date();
  const futurePerformances = performances.filter(({ startsAt }) => startsAt >= now);

  if (futurePerformances.length === 0) return "ended";
  if (futurePerformances.every(({ bookingOpensAt }) => bookingOpensAt && bookingOpensAt > now)) return "upcoming";

  const bookingOpenPerformances = futurePerformances.filter(({ bookingOpensAt }) => !bookingOpensAt || bookingOpensAt <= now);
  if (bookingOpenPerformances.every(({ bookedSeats, totalSeats }) => bookedSeats === totalSeats)) return "soldout";

  return "available";
};

export const getPeriod = (performances: PerformanceResponse[]) => {
  if (performances.length === 0) return "";

  const firstPerformance = performances.reduce((earliest, current) => (current.startsAt < earliest.startsAt ? current : earliest));
  const lastPerformance = performances.reduce((latest, current) => (current.startsAt > latest.startsAt ? current : latest));

  return `${firstPerformance.startsAt.toLocaleDateString()} ~ ${lastPerformance.startsAt.toLocaleDateString()}`;
};
