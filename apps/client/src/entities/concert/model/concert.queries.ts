import { useQuery } from "@tanstack/react-query";

import { CONCERT_QUERY_KEYS } from "./concert.constants";
import { DAILY_RANKINGS, DUMMY_CONCERTS, HOT_CONCERTS, UPCOMING_CONCERTS } from "./dummy-concert.constants";

/**
 * 현재 API 서버가 미구현 상태이므로 더미 데이터를 반환하도록 구현되어 있습니다.
 * API 서버가 구현되면 queryFn을 실제 API 호출로 교체하면 됩니다.
 */

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
