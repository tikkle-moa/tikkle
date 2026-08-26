import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { usePerformanceNew } from "@pages/performance-new/model/use-performance-new";

const { mockNavigate, mockUseConcertDetail, mockUseParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseConcertDetail: vi.fn(),
  mockUseParams: vi.fn(),
}));

vi.mock("@entities/concert", () => ({
  useConcertDetail: mockUseConcertDetail,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: mockUseParams,
  };
});

const concert = {
  id: 7,
  title: "테스트 콘서트",
  genre: "INDIE" as const,
  placeName: "테스트 공연장",
  posterUrl: null,
  description: null,
  createdAt: "2099-01-01T00:00:00",
};

const performances = [
  {
    id: 1,
    concertId: 7,
    startsAt: "2099-09-01T19:00:00",
    bookingOpensAt: null,
    createdAt: "2099-08-01T12:00:00",
  },
];

describe("usePerformanceNew", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({
      concertId: "7",
    });

    mockUseConcertDetail.mockReturnValue({
      data: {
        concert,
        performances,
      },
      isError: false,
      isPending: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("콘서트 상세 조회 상태를 페이지에 필요한 형태로 반환한다", () => {
    const { result } = renderHook(() => usePerformanceNew());

    expect(mockUseConcertDetail).toHaveBeenCalledWith(7);
    expect(result.current.concertId).toBe(7);
    expect(result.current.concert).toEqual(concert);
    expect(result.current.performances).toEqual(performances);
    expect(result.current.isParamValid).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("상세 조회 데이터가 없으면 빈 회차 목록을 반환한다", () => {
    mockUseConcertDetail.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => usePerformanceNew());

    expect(result.current.concert).toBeUndefined();
    expect(result.current.performances).toEqual([]);
    expect(result.current.isPending).toBe(true);
  });

  it("완료하면 콘서트 상세 페이지로 이동한다", () => {
    const { result } = renderHook(() => usePerformanceNew());

    act(() => {
      result.current.handleComplete();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/concerts/7", {
      replace: true,
    });
  });

  it("잘못된 콘서트 ID에서 완료하면 콘서트 목록으로 이동한다", () => {
    mockUseParams.mockReturnValue({
      concertId: "invalid",
    });

    const { result } = renderHook(() => usePerformanceNew());

    expect(result.current.isParamValid).toBe(false);

    act(() => {
      result.current.handleComplete();
    });

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
  });
});
