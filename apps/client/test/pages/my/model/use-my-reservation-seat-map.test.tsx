import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import type { MyReservation } from "@entities/reservation";

import { useMyReservationSeatMap } from "@pages/my/model/use-my-reservation-seat-map";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
  },
}));

const reservation: MyReservation = {
  id: 501,
  concertTitle: "아이유 콘서트",
  posterUrl: null,
  performanceName: "금요일 공연",
  performanceStartsAt: "2026-12-18T19:00:00",
  venueName: "티클 아레나",
  seats: [
    { sectionName: "R석", seatLabel: "A-12" },
    { sectionName: "R석", seatLabel: "A-13" },
  ],
  amount: 132000,
  status: "SUCCEEDED",
  createdAt: "2026-09-30T12:00:00",
};

const concerts = [
  {
    id: 51,
    venueId: 7,
    title: "아이유 콘서트",
    genre: "BALLAD" as const,
    venueName: "티클 아레나",
    posterUrl: null,
    createdAt: "2026-09-30T12:00:00",
  },
];

const venueDetail = {
  venue: {
    id: 7,
    name: "티클 아레나",
    address: "서울",
    description: null,
    width: 100,
    height: 80,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 40,
    stageHeight: 8,
    createdAt: "2026-09-30T12:00:00",
  },
  venueSeats: [
    {
      id: 701,
      venueId: 7,
      sectionName: "R석",
      seatNumber: 12,
      seatLabel: "A-12",
      price: 66000,
      positionX: 20,
      positionY: 30,
      createdAt: "2026-09-30T12:00:00",
    },
    {
      id: 702,
      venueId: 7,
      sectionName: "R석",
      seatNumber: 13,
      seatLabel: "A-13",
      price: 66000,
      positionX: 24,
      positionY: 30,
      createdAt: "2026-09-30T12:00:00",
    },
    {
      id: 703,
      venueId: 7,
      sectionName: "S석",
      seatNumber: 1,
      seatLabel: "B-1",
      price: 44000,
      positionX: 28,
      positionY: 30,
      createdAt: "2026-09-30T12:00:00",
    },
  ],
};

const success = <T,>(data: T) => ({ data: { success: true, data }, error: undefined, response: { ok: true, status: 200 } });

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useMyReservationSeatMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("예매 정보가 없으면 좌석을 조회하지 않고 빈 상태를 반환한다", () => {
    const { result } = renderHook(() => useMyReservationSeatMap(undefined), { wrapper: createWrapper() });

    expect(result.current.reservationSeatCount).toBe(0);
    expect(result.current.selectedSeatIds).toEqual(new Set());
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("모달을 열면 콘서트의 공연장 좌석을 조회해 예매 좌석 ID를 반환한다", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/concerts") return Promise.resolve(success(concerts));
      if (path === "/api/venues/{id}") return Promise.resolve(success(venueDetail));
      throw new Error(`Unexpected GET ${path}`);
    });

    const { result } = renderHook(() => useMyReservationSeatMap(reservation), { wrapper: createWrapper() });

    expect(mockGet).not.toHaveBeenCalled();
    act(() => result.current.open());

    await waitFor(() => expect(result.current.selectedSeatIds).toEqual(new Set([701, 702])));
    expect(mockGet).toHaveBeenNthCalledWith(1, "/api/concerts");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/api/venues/{id}", { params: { path: { id: 7 } } });
    expect(result.current.matchingConcertCount).toBe(1);
    expect(result.current.isPending).toBe(false);

    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
  });

  it("일치하는 콘서트가 없으면 공연장 상세를 조회하지 않는다", async () => {
    mockGet.mockResolvedValue(success([{ ...concerts[0], title: "다른 콘서트" }]));

    const { result } = renderHook(() => useMyReservationSeatMap(reservation), { wrapper: createWrapper() });

    act(() => result.current.open());
    await waitFor(() => {
      expect(result.current.matchingConcertCount).toBe(0);
      expect(result.current.isPending).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledOnce();
    expect(mockGet).toHaveBeenCalledWith("/api/concerts");
  });

  it("콘서트명과 공연장명이 모두 일치하는 콘서트가 여러 개면 공연장 상세를 임의로 조회하지 않는다", async () => {
    mockGet.mockResolvedValue(success([...concerts, { ...concerts[0], id: 52, venueId: 8 }]));

    const { result } = renderHook(() => useMyReservationSeatMap(reservation), { wrapper: createWrapper() });

    act(() => result.current.open());
    await waitFor(() => expect(result.current.matchingConcertCount).toBe(2));

    expect(result.current.isPending).toBe(false);
    expect(mockGet).toHaveBeenCalledOnce();
  });

  it("콘서트 목록 조회 오류를 좌석 지도 오류로 반환한다", async () => {
    mockGet.mockRejectedValue(new Error("concert query failed"));

    const { result } = renderHook(() => useMyReservationSeatMap(reservation), { wrapper: createWrapper() });

    act(() => result.current.open());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isPending).toBe(false);
    expect(mockGet).toHaveBeenCalledWith("/api/concerts");
  });

  it("공연장 상세 조회 오류를 좌석 지도 오류로 반환한다", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/concerts") return Promise.resolve(success(concerts));
      if (path === "/api/venues/{id}") return Promise.reject(new Error("venue query failed"));
      throw new Error(`Unexpected GET ${path}`);
    });

    const { result } = renderHook(() => useMyReservationSeatMap(reservation), { wrapper: createWrapper() });

    act(() => result.current.open());
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isPending).toBe(false);
    expect(mockGet).toHaveBeenCalledWith("/api/venues/{id}", { params: { path: { id: 7 } } });
  });
});
