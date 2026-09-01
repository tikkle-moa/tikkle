import { renderHook } from "@testing-library/react";

import { usePerformanceDetail } from "@pages/performance-detail/model/use-performance-detail";

const { mockUseParams, mockUsePerformanceDetailQuery, mockUseVenueDetailQuery } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUsePerformanceDetailQuery: vi.fn(),
  mockUseVenueDetailQuery: vi.fn(),
}));

vi.mock("react-router", () => ({
  useParams: mockUseParams,
}));

vi.mock("@entities/performance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/performance")>();

  return {
    ...actual,
    usePerformanceDetail: mockUsePerformanceDetailQuery,
  };
});

vi.mock("@entities/venue", () => ({
  useVenueDetail: mockUseVenueDetailQuery,
}));

const performance = {
  id: 3,
  concertId: 10,
  venueId: 1,
  name: "Tikkle Live",
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: "2026-08-28T14:00:00",
  createdAt: "2026-08-25T12:00:00",
  status: "UPCOMING",
};

const venue = {
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
};

describe("usePerformanceDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({ performanceId: "3" });
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: performance,
      isError: false,
      isPending: false,
      isSuccess: true,
    });
    mockUseVenueDetailQuery.mockReturnValue({
      data: { venue, venueSeats: [] },
      isError: false,
      isPending: false,
    });
  });

  it("URL ID로 공연 상세와 공연장 상세를 조회한다", () => {
    const { result } = renderHook(() => usePerformanceDetail());

    expect(mockUsePerformanceDetailQuery).toHaveBeenCalledWith(3);
    expect(mockUseVenueDetailQuery).toHaveBeenCalledWith(1, true);
    expect(result.current).toEqual({
      isParamValid: true,
      performance,
      venue,
      seats: [],
      isError: false,
      isPending: false,
    });
  });

  it("잘못된 ID는 유효하지 않은 상태로 처리한다", () => {
    mockUseParams.mockReturnValue({ performanceId: "invalid" });
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
      isSuccess: false,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(mockUsePerformanceDetailQuery).toHaveBeenCalledWith(Number.NaN);
    expect(mockUseVenueDetailQuery).toHaveBeenCalledWith(0, true);
    expect(result.current.isParamValid).toBe(false);
  });

  it("종료된 회차는 공연장 조회를 비활성화하고 해당 상태를 무시한다", () => {
    const endedPerformance = { ...performance, status: "ENDED" };

    mockUsePerformanceDetailQuery.mockReturnValue({
      data: endedPerformance,
      isError: false,
      isPending: false,
      isSuccess: true,
    });
    mockUseVenueDetailQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: true,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(mockUseVenueDetailQuery).toHaveBeenCalledWith(1, false);
    expect(result.current).toEqual({
      isParamValid: true,
      performance: endedPerformance,
      venue: undefined,
      seats: [],
      isError: false,
      isPending: false,
    });
  });

  it("공연 조회 중에는 로딩 상태를 반환한다", () => {
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
      isSuccess: false,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(result.current.isPending).toBe(true);
  });

  it("공연장 조회 중에도 로딩 상태를 반환한다", () => {
    mockUseVenueDetailQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(result.current.isPending).toBe(true);
  });

  it("공연 조회 실패 상태를 반환한다", () => {
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
      isSuccess: false,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(result.current.isError).toBe(true);
    expect(result.current.isPending).toBe(false);
  });
});
