import { renderHook } from "@testing-library/react";

import { usePerformanceDetail } from "@pages/performance-detail/model/use-performance-detail";

const { mockUseConcertDetail, mockUseParams, mockUsePerformanceDetailQuery } = vi.hoisted(() => ({
  mockUseConcertDetail: vi.fn(),
  mockUseParams: vi.fn(),
  mockUsePerformanceDetailQuery: vi.fn(),
}));

vi.mock("react-router", () => ({
  useParams: mockUseParams,
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();

  return {
    ...actual,
    useConcertDetail: mockUseConcertDetail,
  };
});

vi.mock("@entities/performance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/performance")>();

  return {
    ...actual,
    usePerformanceDetail: mockUsePerformanceDetailQuery,
  };
});

const performance = {
  id: 3,
  concertId: 10,
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: "2026-08-28T14:00:00",
  createdAt: "2026-08-25T12:00:00",
};
const seats = [{ id: 1, performanceId: 3, seatLabel: "A구역 1번" }];
const concert = { id: 10, title: "Tikkle Live" };

describe("usePerformanceDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ performanceId: "3" });
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: { performance, seats },
      isError: false,
      isPending: false,
    });
    mockUseConcertDetail.mockReturnValue({
      data: { concert },
      isError: false,
      isPending: false,
    });
  });

  it("URL ID로 공연을 조회한 뒤 concertId로 콘서트를 조회한다", () => {
    const { result } = renderHook(() => usePerformanceDetail());

    expect(mockUsePerformanceDetailQuery).toHaveBeenCalledWith(3);
    expect(mockUseConcertDetail).toHaveBeenCalledWith(10);
    expect(result.current).toEqual({
      isParamValid: true,
      concert,
      performance,
      seats,
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
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(mockUsePerformanceDetailQuery).toHaveBeenCalledWith(Number.NaN);
    expect(mockUseConcertDetail).toHaveBeenCalledWith(0);
    expect(result.current.isParamValid).toBe(false);
  });

  it("공연 조회 중에는 로딩 상태를 반환한다", () => {
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(result.current.isPending).toBe(true);
  });

  it("공연 조회 실패 시 비활성 콘서트 쿼리의 로딩 상태를 합산하지 않는다", () => {
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
    });
    mockUseConcertDetail.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(result.current.isError).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it("공연 조회 후에는 콘서트 쿼리의 로딩과 오류 상태를 합산한다", () => {
    mockUseConcertDetail.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: true,
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(result.current.isError).toBe(true);
    expect(result.current.isPending).toBe(true);
  });
});
