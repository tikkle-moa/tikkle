import type { BookingStatus, ConcertResponse } from "./concert.types";

interface PerformancePeriodItem {
  startsAt: Date | string;
}

const toDate = (startsAt: Date | string) => (startsAt instanceof Date ? startsAt : new Date(startsAt));

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

export const getPeriod = (performances: PerformancePeriodItem[]) => {
  if (performances.length === 0) {
    return "";
  }

  const firstPerformance = performances.reduce((earliest, current) => (toDate(current.startsAt) < toDate(earliest.startsAt) ? current : earliest));
  const lastPerformance = performances.reduce((latest, current) => (toDate(current.startsAt) > toDate(latest.startsAt) ? current : latest));

  return `${toDate(firstPerformance.startsAt).toLocaleDateString()} ~ ${toDate(lastPerformance.startsAt).toLocaleDateString()}`;
};
