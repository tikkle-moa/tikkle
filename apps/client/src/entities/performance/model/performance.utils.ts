import type { PerformanceResponse } from "./performance.types";

export const formatPerformanceDateTime = (dateTime: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));

export const getPerformancePeriod = (performances: PerformanceResponse[]) => {
  if (performances.length === 0) {
    return "회차 준비 중";
  }

  const sortedPerformances = [...performances].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const firstPerformance = formatPerformanceDateTime(sortedPerformances[0].startsAt);
  const lastPerformance = formatPerformanceDateTime(sortedPerformances.at(-1)!.startsAt);

  return firstPerformance === lastPerformance ? firstPerformance : `${firstPerformance} ~ ${lastPerformance}`;
};
