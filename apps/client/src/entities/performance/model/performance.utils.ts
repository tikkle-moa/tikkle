import { formatDate, toDate } from "@shared/lib/date.utils";

import type { PerformanceResponse } from "./performance.types";

export const getPeriod = (performances: PerformanceResponse[]) => {
  if (performances.length === 0) {
    return "";
  }

  const firstPerformance = performances.reduce((earliest, current) => (toDate(current.startsAt) < toDate(earliest.startsAt) ? current : earliest));
  const lastPerformance = performances.reduce((latest, current) => (toDate(current.startsAt) > toDate(latest.startsAt) ? current : latest));

  return `${formatDate(firstPerformance.startsAt)} ~ ${formatDate(lastPerformance.startsAt)}`;
};
