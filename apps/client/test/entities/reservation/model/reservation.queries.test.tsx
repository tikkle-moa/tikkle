import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { type MyReservation, useMyReservation } from "@entities/reservation";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useMyReservation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("생성된 API 응답 타입으로 내 예매 목록을 조회한다", async () => {
    const myReservations: MyReservation[] = [
      {
        id: 501,
        concertTitle: "콘서트 A",
        posterUrl: "https://example.com/poster.jpg",
        performanceName: "금요일 공연",
        performanceStartsAt: "2026-12-18T19:00:00",
        venueName: "공연장 A",
        venueId: 7,
        seats: [
          { sectionName: "R석", seatLabel: "A-12" },
          { sectionName: "R석", seatLabel: "A-13" },
        ],
        amount: 132000,
        status: "SUCCEEDED",
        createdAt: "2026-09-30T12:00:00",
      },
    ];
    mockGet.mockResolvedValue({
      data: { data: myReservations },
      error: undefined,
      response: { ok: true, status: 200 },
    });

    const { result } = renderHook(() => useMyReservation(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(myReservations));
    expect(mockGet).toHaveBeenCalledWith("/api/reservations");
  });

  it.each([
    ["HTTP 오류", { data: undefined, error: undefined, response: { ok: false, status: 500 } }],
    ["오류 응답", { data: { data: [] }, error: { message: "요청 실패" }, response: { ok: true, status: 200 } }],
    ["응답 데이터 없음", { data: undefined, error: undefined, response: { ok: true, status: 200 } }],
  ])("%s를 조회 오류로 처리한다", async (_caseName, response) => {
    mockGet.mockResolvedValue(response);

    const { result } = renderHook(() => useMyReservation(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ message: "내 예매 목록을 불러오지 못했습니다." });
  });

  it("네트워크 오류를 쿼리 오류로 전달한다", async () => {
    mockGet.mockRejectedValue(new Error("네트워크 오류"));

    const { result } = renderHook(() => useMyReservation(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ message: "네트워크 오류" });
  });
});
