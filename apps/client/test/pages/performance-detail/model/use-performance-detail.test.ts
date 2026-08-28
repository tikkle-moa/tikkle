import { renderHook } from "@testing-library/react";

import { usePerformanceDetail } from "@pages/performance-detail/model/use-performance-detail";

const { mockUseParams, mockUsePerformanceDetailQuery } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUsePerformanceDetailQuery: vi.fn(),
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

const performance = {
  id: 3,
  concertId: 10,
  name: "Tikkle Live",
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: "2026-08-28T14:00:00",
  createdAt: "2026-08-25T12:00:00",
  status: "UPCOMING",
};
describe("usePerformanceDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ performanceId: "3" });
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: performance,
      isError: false,
      isPending: false,
    });
  });

  it("URL ID로 공연 상세를 조회한다", () => {
    const { result } = renderHook(() => usePerformanceDetail());

    expect(mockUsePerformanceDetailQuery).toHaveBeenCalledWith(3);
    expect(result.current).toEqual({
      isParamValid: true,
      performance,
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
    });

    const { result } = renderHook(() => usePerformanceDetail());

    expect(mockUsePerformanceDetailQuery).toHaveBeenCalledWith(Number.NaN);
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

  it("공연 조회 실패 상태를 반환한다", () => {
    mockUsePerformanceDetailQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
    });
    const { result } = renderHook(() => usePerformanceDetail());

    expect(result.current.isError).toBe(true);
    expect(result.current.isPending).toBe(false);
  });
});
