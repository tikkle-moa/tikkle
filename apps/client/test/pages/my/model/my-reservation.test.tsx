import type { ComponentProps, FormEvent, PropsWithChildren } from "react";
import toast from "react-hot-toast";
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

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 1000 * 60 * 5 } } });
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

  it("상세 API 응답이 실패하면 조회 오류 상태를 반환한다", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "request failed" }, response: { ok: false, status: 500 } });
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.reservation).toBeUndefined();
  });

  it("신선한 목록 캐시는 상세 API 재요청 없이 초기 데이터로 사용한다", () => {
    const { wrapper } = createDetailWrapper(["/my/reservations/501"], [reservation]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    expect(result.current.reservation).toEqual(reservation);
    expect(result.current.isPending).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("오래된 목록 캐시는 먼저 표시하면서 상세 API를 다시 조회한다", async () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { queryClient, wrapper } = createDetailWrapper(["/my/reservations/501"], [reservation]);
    queryClient.setQueryData(RESERVATION_QUERY_KEYS.my(), [reservation], { updatedAt: Date.now() - 1000 * 60 * 6 });
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    expect(result.current.reservation).toEqual(reservation);
    expect(result.current.isPending).toBe(false);
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith("/api/reservations/{reservationId}", {
        params: { path: { reservationId: 501 } },
      }),
    );
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
    mockGet.mockResolvedValueOnce(success({ ...reservation, status: "REFUNDED" }));
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
    expect(toast.success).toHaveBeenCalledWith("예매가 취소되었습니다.");
  });

  it("취소 확인을 닫으면 확인 상태를 초기화한다", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    act(() => result.current.handleCancel());
    expect(result.current.isCancelConfirmationOpen).toBe(true);

    act(() => result.current.handleDismissCancel());
    expect(result.current.isCancelConfirmationOpen).toBe(false);
  });

  it("상세 조회 전 취소가 완료되어도 캐시 없이 처리한다", async () => {
    let resolveReservationQuery: (() => void) | undefined;
    let resolveCancellation: (() => void) | undefined;
    mockGet
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveReservationQuery = () => resolve(success(reservation));
          }),
      )
      .mockResolvedValue(success(reservation));
    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCancellation = () => resolve(success({ reservationId: reservation.id, status: "REFUNDED" }));
        }),
    );
    const { queryClient, wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const setQueryData = vi.spyOn(queryClient, "setQueryData");
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    act(() => result.current.handleCancel());
    act(() => result.current.handleConfirmCancel());
    await waitFor(() => expect(mockPost).toHaveBeenCalledOnce());
    await act(async () => resolveCancellation?.());
    await waitFor(() => expect(setQueryData).toHaveBeenCalledTimes(2));
    expect(result.current.isCancelling).toBe(true);

    await act(async () => resolveReservationQuery?.());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("예매가 취소되었습니다."));
  });

  it("취소 API 응답이 실패하면 오류 알림을 표시한다", async () => {
    mockGet.mockResolvedValue(success(reservation));
    mockPost.mockResolvedValue({ data: undefined, error: { message: "request failed" }, response: { ok: false, status: 500 } });
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    act(() => result.current.handleCancel());
    await act(async () => result.current.handleConfirmCancel());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("예매 취소에 실패했습니다. 잠시 후 다시 시도해 주세요."));
    expect(result.current.isCancelling).toBe(false);
  });

  it("환불 계좌가 필요하면 입력 안내를 표시한다", async () => {
    mockGet.mockResolvedValue(success(reservation));
    mockPost.mockResolvedValue(success({ reservationId: reservation.id, status: "REFUND_ACCOUNT_REQUIRED" }));
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    act(() => result.current.handleCancel());
    await act(async () => result.current.handleConfirmCancel());

    await waitFor(() => expect(toast).toHaveBeenCalledWith("환불 계좌 정보를 입력해 주세요."));
  });

  it("취소 결과 확인 중이면 진행 안내를 표시한다", async () => {
    mockGet.mockResolvedValue(success(reservation));
    mockPost.mockResolvedValue(success({ reservationId: reservation.id, status: "CANCELLATION_PENDING" }));
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    act(() => result.current.handleCancel());
    await act(async () => result.current.handleConfirmCancel());

    await waitFor(() => expect(toast).toHaveBeenCalledWith("예매 취소를 확인하고 있어요."));
  });

  it("실패 후 같은 취소 요청을 재시도하면 요청 ID를 재사용하고 다른 예매 캐시는 유지한다", async () => {
    const otherReservation = { ...reservation, id: 502 };
    mockGet.mockResolvedValue(success(reservation));
    mockPost.mockRejectedValueOnce(new Error("request failed")).mockResolvedValueOnce(success({ reservationId: reservation.id, status: "REFUNDED" }));
    const { queryClient, wrapper } = createDetailWrapper(["/my/reservations/501"], [otherReservation]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    act(() => result.current.handleCancel());
    await act(async () => result.current.handleConfirmCancel());
    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    await waitFor(() => expect(result.current.isCancelling).toBe(false));

    const firstRequestId = mockPost.mock.calls[0][1].body.requestId;
    act(() => result.current.handleCancel());
    await act(async () => result.current.handleConfirmCancel());

    await waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
    expect(mockPost.mock.calls[1][1].body.requestId).toBe(firstRequestId);
    expect(queryClient.getQueryData<MyReservation[]>(RESERVATION_QUERY_KEYS.my())).toEqual([otherReservation]);
  });

  it("잘못된 예매 ID로 상세 API를 호출하지 않는다", () => {
    const { wrapper } = createDetailWrapper(["/my/reservations/not-an-id"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    act(() => result.current.handleCancel());
    act(() => result.current.handleConfirmCancel());

    expect(mockGet).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("취소 처리 중에는 중복 취소와 환불 계좌 요청을 무시한다", async () => {
    let resolveCancellation: (() => void) | undefined;
    mockGet.mockResolvedValue(success(reservation));
    mockPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCancellation = () => resolve(success({ reservationId: reservation.id, status: "CANCELLATION_PENDING" }));
        }),
    );
    const { wrapper } = createDetailWrapper(["/my/reservations/501"]);
    const { result } = renderHook(() => useMyReservationDetail(), { wrapper });

    await waitFor(() => expect(result.current.reservation).toEqual(reservation));
    act(() => result.current.handleCancel());
    act(() => result.current.handleConfirmCancel());
    await waitFor(() => expect(result.current.isCancelling).toBe(true));

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleCancel();
      result.current.handleRefundAccountSubmit({ preventDefault } as unknown as FormEvent<HTMLFormElement>);
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.isCancelConfirmationOpen).toBe(false);
    expect(mockPost).toHaveBeenCalledOnce();

    await act(async () => resolveCancellation?.());
    await waitFor(() => expect(result.current.isCancelling).toBe(false));
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
