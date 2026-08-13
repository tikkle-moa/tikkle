import { useQuery } from "@tanstack/react-query";

import { CONCERT_QUERY_KEYS } from "./concert.constants";
import { DAILY_RANKINGS, DUMMY_CONCERTS, HOT_CONCERTS, UPCOMING_CONCERTS } from "./dummy-concert.constants";

export const useConcerts = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.all,
    queryFn: () => DUMMY_CONCERTS,
  });

export const useUpcomingConcerts = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.upcoming(),
    queryFn: () => UPCOMING_CONCERTS,
  });

export const useHotConcerts = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.hot(),
    queryFn: () => HOT_CONCERTS,
  });

export const useDailyRankings = () =>
  useQuery({
    queryKey: CONCERT_QUERY_KEYS.dailyRankings(),
    queryFn: () => DAILY_RANKINGS,
  });
