import type { ComponentProps, FormEvent, PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";

import { type MyReservation, RESERVATION_QUERY_KEYS } from "@entities/reservation";

import { useMyReservationDetail } from "@pages/my/model/use-my-reservation-detail";

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
  posterUrl: "https://example.com/iu-poster.jpg",
  performanceName: "금요일 공연",
  performanceStartsAt: "2026-12-18T19:00:00",
  venueName: "티클 아레나",
  seats: [{ sectionName: "R석", seatLabel: "A-12" }],
  amount: 66000,
  status: "SUCCEEDED" as const,
  createdAt: "2026-09-30T12:00:00",
};

const success = <T,>(data: T) => ({ data: { success: true, data }, error: undefined, response: { ok: true, status: 200 } });

const CurrentLocation = () => {
  const { pathname, search } = useLocation();

  return (
    <div data-testid="current-location">
      {pathname}
      {search}
    </div>
  );
};

const createDetailWrapper = (
  initialEntries: NonNullable<ComponentProps<typeof MemoryRouter>["initialEntries"]>,
  cachedReservations?: MyReservation[],
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cachedReservations) queryClient.setQueryData(RESERVATION_QUERY_KEYS.my(), cachedReservations);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/my/reservations" element={<CurrentLocation />} />
          <Route
            path="/my/reservations/:reservationId"
            element={
              <>
                {children}
                <CurrentLocation />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { queryClient, wrapper };
};

describe("내 예매 조회", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("URL 예매 ID로 상세 API를 조회한다", async () => {
    mockGet.mockResolvedValue(success(reservation));
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    expect(mockGet).toHaveBeenCalledWith("/api/reservations/{reservationId}", {
      params: { path: { reservationId: 501 } },
    });
  });

  it("목록 쿼리 캐시를 상세 초기 데이터로 사용한다", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { wrapper } = createDetailWrapper(["/my/reservations/501"], [reservation]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    expect(result.current.reservation).toEqual(reservation);
    expect(result.current.isPending).toBe(false);
    expect(mockGet).toHaveBeenCalledWith("/api/reservations/{reservationId}", {
      params: { path: { reservationId: 501 } },
    });
  });

  it("상세 훅에서 좌석 지도 훅을 조합하고 모달을 열 때 공연장 좌석을 조회한다", async () => {
    const concerts = [{ id: 12, venueId: 7, title: reservation.concertTitle, venueName: reservation.venueName }];
    const venueDetail = {
      venueSeats: [{ id: 701, sectionName: "R석", seatLabel: "A-12" }],
    };
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/reservations/{reservationId}") return Promise.resolve(success(reservation));
      if (path === "/api/concerts") return Promise.resolve(success(concerts));
      if (path === "/api/venues/{id}") return Promise.resolve(success(venueDetail));
      throw new Error(`Unexpected GET ${path}`);
    });
    const { wrapper } = createDetailWrapper(["/my/reservations/501"], [reservation]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    expect(result.current.seatMap.isOpen).toBe(false);
    expect(mockGet).not.toHaveBeenCalledWith("/api/concerts");

    act(() => result.current.seatMap.open());

    await waitFor(() => expect(result.current.seatMap.selectedSeatIds).toEqual(new Set([701])));
    expect(mockGet).toHaveBeenCalledWith("/api/concerts");
    expect(mockGet).toHaveBeenCalledWith("/api/venues/{id}", { params: { path: { id: 7 } } });
  });

  it("예매 취소 API를 호출하고 상세 데이터를 갱신한다", async () => {
    mockGet.mockResolvedValueOnce(success(reservation)).mockResolvedValueOnce(success({ ...reservation, status: "REFUNDED" }));
    mockPost.mockResolvedValue(success({ reservationId: reservation.id, status: "REFUNDED" }));
    const { queryClient, wrapper } = createDetailWrapper(["/my/reservations/501"], [reservation]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    act(() => result.current.handleCancel());

    expect(result.current.isCancelConfirmationOpen).toBe(true);
    expect(mockPost).not.toHaveBeenCalled();
    await act(async () => result.current.handleConfirmCancel());

    expect(result.current.isCancelConfirmationOpen).toBe(false);
    expect(mockPost).toHaveBeenCalledWith("/api/reservations/{reservationId}/cancel", {
      params: { path: { reservationId: 501 } },
      body: { requestId: expect.any(String), refundReceiveAccount: null },
    });
    await waitFor(() => expect(result.current.reservation?.status).toBe("REFUNDED"));
    expect(queryClient.getQueryData<MyReservation[]>(RESERVATION_QUERY_KEYS.my())?.[0].status).toBe("REFUNDED");
  });

  it("잘못된 예매 ID로 상세 API를 호출하지 않는다", () => {
    const { wrapper } = createDetailWrapper(["/my/reservations/not-an-id"]);
    renderHook(() => useMyReservationDetail(), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("목록에서 진입하면 이전 필터 URL로 돌아간다", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { wrapper } = createDetailWrapper([
      "/my/reservations?filter=ALL",
      { pathname: "/my/reservations/501", state: { fromMyReservations: true } },
    ]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    act(() => result.current.handleBackToReservations());

    expect(screen.getByTestId("current-location")).toHaveTextContent("/my/reservations?filter=ALL");
  });

  it("직접 진입이면 예매 목록 경로로 이동한다", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    act(() => result.current.handleBackToReservations());

    expect(screen.getByTestId("current-location")).toHaveTextContent("/my/reservations");
  });

  it("환불 계좌를 제출하면 공백을 제거해 취소 API에 전달한다", async () => {
    mockGet.mockResolvedValue(success(reservation));
    mockPost.mockResolvedValue(success({ reservationId: reservation.id, status: "REFUNDED" }));
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    act(() => {
      result.current.setBank(" 004 ");
      result.current.setAccountNumber(" 0123456789 ");
      result.current.setHolderName(" 홍길동 ");
    });

    const preventDefault = vi.fn();
    act(() => result.current.handleRefundAccountSubmit({ preventDefault } as unknown as FormEvent<HTMLFormElement>));

    expect(preventDefault).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/api/reservations/{reservationId}/cancel", {
        params: { path: { reservationId: 501 } },
        body: {
          requestId: expect.any(String),
          refundReceiveAccount: { bank: "004", accountNumber: "0123456789", holderName: "홍길동" },
        },
      }),
    );
  });
});
