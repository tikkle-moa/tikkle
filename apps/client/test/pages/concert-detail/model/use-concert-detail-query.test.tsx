import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import type { ConcertDetailResponse } from "@pages/concert-detail/model/concert-detail.types";
import { useConcertDetailQuery } from "@pages/concert-detail/model/use-concert-detail-query";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
  },
}));

const concertDetail: ConcertDetailResponse = {
  concert: {
    id: 1,
    title: "테스트 콘서트",
    genre: "INDIE",
    placeName: "테스트 공연장",
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

describe("useConcertDetailQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("콘서트 상세 정보를 조회한다", async () => {
    mockGet.mockResolvedValue({
      data: { data: concertDetail },
      error: undefined,
      response: { ok: true, status: 200 },
    });

    const { result } = renderHook(() => useConcertDetailQuery(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(concertDetail);
    });

    expect(mockGet).toHaveBeenCalledWith("/api/concerts/{id}", {
      params: { path: { id: 1 } },
    });
  });

  it("없는 콘서트는 null을 반환한다", async () => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { message: "대상을 찾을 수 없습니다." },
      response: { ok: false, status: 404 },
    });

    const { result } = renderHook(() => useConcertDetailQuery(404), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });

    expect(result.current.isError).toBe(false);
  });

  it("404 이외의 실패는 오류 상태로 처리한다", async () => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { message: "서버 오류" },
      response: { ok: false, status: 500 },
    });

    const { result } = renderHook(() => useConcertDetailQuery(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(expect.any(Error));
  });

  it("유효하지 않은 콘서트 ID에는 요청하지 않는다", () => {
    renderHook(() => useConcertDetailQuery(0), {
      wrapper: createWrapper(),
    });

    expect(mockGet).not.toHaveBeenCalled();
  });
});
