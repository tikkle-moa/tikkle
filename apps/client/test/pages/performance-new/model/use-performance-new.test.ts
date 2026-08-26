import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { usePerformanceNew } from "@pages/performance-new/model/use-performance-new";

const { mockNavigate, mockUseConcertDetail, mockUseParams, mockDeletePerformance, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseConcertDetail: vi.fn(),
  mockUseParams: vi.fn(),
  mockDeletePerformance: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
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

vi.mock("react-hot-toast", () => ({
  default: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock("@features/performance-form", () => ({
  deletePerformance: mockDeletePerformance,
}));

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

  it("생성 폼을 열고 닫는다", () => {
    const { result } = renderHook(() => usePerformanceNew());

    act(() => {
      result.current.handleCreateOpen();
    });

    expect(result.current.isCreateOpen).toBe(true);

    act(() => {
      result.current.handleCreateClose();
    });

    expect(result.current.isCreateOpen).toBe(false);
  });

  it("서로 다른 회차 편집을 독립적으로 연다", () => {
    const { result } = renderHook(() => usePerformanceNew());

    act(() => {
      result.current.handleEditOpen(1);
      result.current.handleEditOpen(2);
    });

    expect(result.current.editingPerformanceIds).toEqual(new Set([1, 2]));

    act(() => {
      result.current.handleEditCancel(1);
    });

    expect(result.current.editingPerformanceIds).toEqual(new Set([2]));
  });

  it("삭제를 취소하면 API를 호출하지 않는다", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    const { result } = renderHook(() => usePerformanceNew());

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(mockDeletePerformance).not.toHaveBeenCalled();
  });

  it("회차를 삭제하고 목록을 갱신한다", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mockDeletePerformance.mockResolvedValue(undefined);
    mockUseConcertDetail.mockReturnValue({
      data: { concert, performances },
      isError: false,
      isPending: false,
      refetch,
    });

    const { result } = renderHook(() => usePerformanceNew());

    act(() => {
      result.current.handleEditOpen(1);
    });

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(mockDeletePerformance).toHaveBeenCalledWith(1);
    expect(refetch).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith("공연 회차를 삭제했습니다.");
    expect(result.current.editingPerformanceIds.has(1)).toBe(false);
    expect(result.current.deletingPerformanceIds.has(1)).toBe(false);
  });

  it("삭제 실패 시 오류 토스트를 표시한다", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mockDeletePerformance.mockRejectedValue(new Error("삭제 실패"));

    const { result } = renderHook(() => usePerformanceNew());

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(mockToastError).toHaveBeenCalledWith("공연 회차 삭제 중 오류가 발생했습니다.");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
