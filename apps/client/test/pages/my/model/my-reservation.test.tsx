import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useMyReservation } from "@pages/my/model/use-my-reservation";

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
    POST: mockPost,
  },
}));

const reservation = {
  id: 501,
  concertTitle: "아이유 콘서트",
  performanceName: "금요일 공연",
  performanceStartsAt: "2026-12-18T19:00:00",
  venueName: "티클 아레나",
  seats: [{ sectionName: "R석", seatLabel: "A-12" }],
  amount: 66000,
  status: "SUCCEEDED" as const,
  createdAt: "2026-09-30T12:00:00",
};

const success = <T,>(data: T) => ({ data: { success: true, data }, error: undefined, response: { ok: true, status: 200 } });

const createDetailWrapper = (initialEntry: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/my/reservations/:reservationId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("내 예매 조회", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("URL 예매 ID로 상세 API를 조회한다", async () => {
    mockGet.mockResolvedValue(success(reservation));
    const { result } = renderHook(() => useMyReservation(), { wrapper: createDetailWrapper("/my/reservations/501") });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    expect(mockGet).toHaveBeenCalledWith("/api/reservations/{reservationId}", {
      params: { path: { reservationId: 501 } },
    });
  });

  it("예매 취소 API를 호출하고 상세 데이터를 갱신한다", async () => {
    mockGet.mockResolvedValueOnce(success(reservation)).mockResolvedValueOnce(success({ ...reservation, status: "REFUNDED" }));
    mockPost.mockResolvedValue(success({ reservationId: reservation.id, status: "REFUNDED" }));
    const { result } = renderHook(() => useMyReservation(), { wrapper: createDetailWrapper("/my/reservations/501") });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    await act(async () => result.current.cancelReservation());

    expect(mockPost).toHaveBeenCalledWith("/api/reservations/{reservationId}/cancel", {
      params: { path: { reservationId: 501 } },
      body: { requestId: expect.any(String), refundReceiveAccount: null },
    });
    await waitFor(() => expect(result.current.reservation?.status).toBe("REFUNDED"));
  });

  it("잘못된 예매 ID로 상세 API를 호출하지 않는다", () => {
    renderHook(() => useMyReservation(), { wrapper: createDetailWrapper("/my/reservations/not-an-id") });

    expect(mockGet).not.toHaveBeenCalled();
  });
});
