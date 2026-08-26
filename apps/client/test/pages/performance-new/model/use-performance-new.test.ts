import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { usePerformanceNew } from "@pages/performance-new/model/use-performance-new";

const { mockNavigate, mockUseParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: mockUseParams,
  };
});

describe("usePerformanceNew", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("유효한 콘서트 ID를 반환하고 완료하면 상세 페이지로 이동한다", () => {
    mockUseParams.mockReturnValue({ concertId: "7" });

    const { result } = renderHook(() => usePerformanceNew());

    expect(result.current.concertId).toBe(7);
    expect(result.current.isParamValid).toBe(true);

    act(() => {
      result.current.handleComplete();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/concerts/7", {
      replace: true,
    });
  });

  it("잘못된 콘서트 ID에서 완료하면 콘서트 목록으로 이동한다", () => {
    mockUseParams.mockReturnValue({ concertId: "invalid" });

    const { result } = renderHook(() => usePerformanceNew());

    expect(result.current.isParamValid).toBe(false);

    act(() => {
      result.current.handleComplete();
    });

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
  });
});
