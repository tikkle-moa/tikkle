import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { useVenueDetail } from "@entities/venue";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
  },
}));

const venueDetail = {
  venue: {
    id: 1,
    name: "올림픽공원 KSPO DOME",
    address: "서울특별시 송파구 올림픽로 424",
    description: "가상 공연장 좌석 배치도입니다.",
    width: 100,
    height: 100,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 72,
    stageHeight: 13,
    createdAt: "2026-08-25T12:00:00",
  },
  venueSeats: [
    {
      id: 1,
      venueId: 1,
      sectionName: "A구역",
      seatNumber: 1,
      seatLabel: "A구역 1열 1번",
      price: 150000,
      positionX: 20,
      positionY: 28,
      createdAt: "2026-08-25T12:00:00",
    },
  ],
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

describe("useVenueDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("공연장 상세와 정적 좌석 배치를 조회한다", async () => {
    mockGet.mockResolvedValue({
      data: { data: venueDetail },
      error: undefined,
      response: { ok: true, status: 200 },
    });

    const { result } = renderHook(() => useVenueDetail(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(venueDetail);
    });

    expect(mockGet).toHaveBeenCalledWith("/api/venues/{id}", {
      params: { path: { id: 1 } },
    });
  });

  it.each([404, 500])("%s 응답은 오류 상태로 처리한다", async (status) => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { message: "요청 실패" },
      response: { ok: false, status },
    });

    const { result } = renderHook(() => useVenueDetail(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it("유효하지 않은 공연장 ID에는 요청하지 않는다", () => {
    renderHook(() => useVenueDetail(0), {
      wrapper: createWrapper(),
    });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("비활성화된 공연장 상세 조회에는 요청하지 않는다", () => {
    renderHook(() => useVenueDetail(1, false), {
      wrapper: createWrapper(),
    });

    expect(mockGet).not.toHaveBeenCalled();
  });
});
