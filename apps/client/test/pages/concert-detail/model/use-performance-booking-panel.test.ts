import { act, renderHook } from "@testing-library/react";

import { usePerformanceBookingPanel } from "@pages/concert-detail/model/use-performance-booking-panel";

const { mockDeletePerformance, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockDeletePerformance: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("@features/performance-form", () => ({
  deletePerformance: mockDeletePerformance,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("usePerformanceBookingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("여러 회차의 수정 상태를 독립적으로 관리한다", () => {
    const { result } = renderHook(() => usePerformanceBookingPanel(vi.fn().mockResolvedValue(undefined)));

    act(() => {
      result.current.handleEditOpen(1);
      result.current.handleEditOpen(2);
    });

    expect(result.current.editingPerformanceIds).toEqual(new Set([1, 2]));

    act(() => {
      result.current.handleEditClose(1);
    });

    expect(result.current.editingPerformanceIds).toEqual(new Set([2]));
  });

  it("생성 폼을 열고 닫는다", () => {
    const { result } = renderHook(() => usePerformanceBookingPanel(vi.fn().mockResolvedValue(undefined)));

    act(() => {
      result.current.handleCreateOpen();
    });

    expect(result.current.isCreateOpen).toBe(true);

    act(() => {
      result.current.handleCreateClose();
    });

    expect(result.current.isCreateOpen).toBe(false);
  });

  it("삭제를 취소하면 삭제 요청을 보내지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePerformanceBookingPanel(onChanged));

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(mockDeletePerformance).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("삭제에 성공하면 목록을 갱신하고 수정 상태를 닫는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockDeletePerformance.mockResolvedValue(undefined);

    const onChanged = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePerformanceBookingPanel(onChanged));

    act(() => {
      result.current.handleEditOpen(1);
    });

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(mockDeletePerformance).toHaveBeenCalledWith(1);
    expect(onChanged).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith("공연 회차를 삭제했습니다.");
    expect(result.current.editingPerformanceIds).toEqual(new Set());
    expect(result.current.deletingPerformanceIds).toEqual(new Set());
  });

  it("삭제에 실패하면 오류 알림을 표시하고 삭제 상태를 해제한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockDeletePerformance.mockRejectedValue(new Error("삭제 실패"));

    const { result } = renderHook(() => usePerformanceBookingPanel(vi.fn().mockResolvedValue(undefined)));

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(mockToastError).toHaveBeenCalledWith("공연 회차 삭제 중 오류가 발생했습니다.");
    expect(result.current.deletingPerformanceIds).toEqual(new Set());
  });
});
