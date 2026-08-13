import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { useConcerts, useDailyRankings, useHotConcerts, useUpcomingConcerts } from "@entities/concert";
import { DAILY_RANKINGS, DUMMY_CONCERTS, HOT_CONCERTS, UPCOMING_CONCERTS } from "@entities/concert/model/dummy-concert.constants";

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => QueryClientProvider({ client: queryClient, children });
};

describe("concert.queries", () => {
  it("useConcerts는 DUMMY_CONCERTS를 반환한다", async () => {
    const { result } = renderHook(() => useConcerts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual(DUMMY_CONCERTS);
  });

  it("useUpcomingConcerts는 UPCOMING_CONCERTS를 반환한다", async () => {
    const { result } = renderHook(() => useUpcomingConcerts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual(UPCOMING_CONCERTS);
  });

  it("useHotConcerts는 HOT_CONCERTS를 반환한다", async () => {
    const { result } = renderHook(() => useHotConcerts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual(HOT_CONCERTS);
  });

  it("useDailyRankings는 DAILY_RANKINGS를 반환한다", async () => {
    const { result } = renderHook(() => useDailyRankings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual(DAILY_RANKINGS);
  });
});
