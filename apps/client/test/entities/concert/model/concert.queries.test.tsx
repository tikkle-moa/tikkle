import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { useConcertDetail } from "@entities/concert";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
  },
}));

const concertDetail = {
  concert: {
    id: 1,
    title: "테스트 콘서트",
    genre: "INDIE" as const,
    venueId: 1,
    venueName: "테스트 공연장",
    posterUrl: null,
    description: null,
    createdAt: "2026-08-23T12:00:00",
  },
  performances: [],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useConcertDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("콘서트 상세 정보를 조회한다", async () => {
    mockGet.mockResolvedValue({
      data: { data: concertDetail },
      error: undefined,
      response: { ok: true, status: 200 },
    });

    const { result } = renderHook(() => useConcertDetail(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(concertDetail);
    });

    expect(mockGet).toHaveBeenCalledWith("/api/concerts/{id}", {
      params: { path: { id: 1 } },
    });
  });

  it.each([404, 500])("%s 응답은 오류 상태로 처리한다", async (status) => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { message: "요청 실패" },
      response: { ok: false, status },
    });

    const { result } = renderHook(() => useConcertDetail(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("유효하지 않은 콘서트 ID에는 요청하지 않는다", () => {
    renderHook(() => useConcertDetail(0), {
      wrapper: createWrapper(),
    });

    expect(mockGet).not.toHaveBeenCalled();
  });
});
