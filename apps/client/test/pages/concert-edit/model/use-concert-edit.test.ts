import { act, renderHook, waitFor } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useConcertEdit } from "@pages/concert-edit/model/use-concert-edit";

const { mockGet, mockNavigate, mockPatch, mockUseParams } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockNavigate: vi.fn(),
  mockPatch: vi.fn(),
  mockUseParams: vi.fn(),
}));

vi.mock("react-router", () => ({ useNavigate: () => mockNavigate, useParams: mockUseParams }));
vi.mock("@shared/api", () => ({ apiClient: { GET: mockGet, PATCH: mockPatch } }));

const initialValues = { title: "기존 공연", genre: "INDIE" as const, placeName: "공연장", posterUrl: null, description: null };
const changedValues = { ...initialValues, title: "수정된 콘서트" };

describe("useConcertEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ concertId: "3" });
    mockGet.mockResolvedValue({ data: { data: { concert: initialValues } }, error: undefined, response: { ok: true } });
  });

  it("유효하지 않은 ID이면 오류 상태가 되고 조회하지 않는다", async () => {
    mockUseParams.mockReturnValue({ concertId: "invalid" });
    const { result } = renderHook(() => useConcertEdit());

    await waitFor(() => expect(result.current.loadState).toEqual({ status: "error", error: "잘못된 콘서트 ID입니다." }));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("콘서트 정보를 조회해 성공 상태로 제공한다", async () => {
    const { result } = renderHook(() => useConcertEdit());

    await waitFor(() => expect(result.current.loadState).toEqual({ status: "success", data: initialValues }));
    expect(mockGet).toHaveBeenCalledWith("/api/concerts/{id}", { params: { path: { id: 3 } } });
  });

  it("콘서트 조회가 완료되지 않았으면 수정을 요청하지 않는다", async () => {
    mockUseParams.mockReturnValue({ concertId: "invalid" });
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("error"));

    await act(() => result.current.handleSubmit(initialValues));

    expect(result.current.submitState).toEqual({
      status: "error",
      error: "콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("조회 실패 응답과 요청 예외를 오류 상태로 제공한다", async () => {
    mockGet.mockResolvedValueOnce({ error: { message: "fail" }, response: { ok: false } });
    const { result, unmount } = renderHook(() => useConcertEdit());
    await waitFor(() =>
      expect(result.current.loadState).toEqual({
        status: "error",
        error: "콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      }),
    );
    unmount();

    mockGet.mockRejectedValueOnce(new Error("network"));
    const { result: exceptionResult } = renderHook(() => useConcertEdit());
    await waitFor(() =>
      expect(exceptionResult.current.loadState).toEqual({
        status: "error",
        error: "콘서트 정보를 불러오는 중 오류가 발생했습니다.",
      }),
    );
  });

  it("이전 조회 응답이 늦게 완료되어도 현재 콘서트 상태를 덮어쓰지 않는다", async () => {
    let resolveFirst!: (value: Awaited<ReturnType<typeof mockGet>>) => void;
    mockGet
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ data: { data: { concert: { ...initialValues, title: "2번 콘서트" } } }, error: undefined, response: { ok: true } });

    mockUseParams.mockReturnValue({ concertId: "1" });
    const { result, rerender } = renderHook(() => useConcertEdit());

    mockUseParams.mockReturnValue({ concertId: "2" });
    rerender();

    await waitFor(() => expect(result.current.loadState).toEqual({ status: "success", data: { ...initialValues, title: "2번 콘서트" } }));

    await act(async () => {
      resolveFirst({ data: { data: { concert: { ...initialValues, title: "1번 콘서트" } } }, error: undefined, response: { ok: true } });
    });
    expect(result.current.loadState).toEqual({ status: "success", data: { ...initialValues, title: "2번 콘서트" } });
  });

  it("이전 조회 응답이 늦게 예외가 발생하면 현재 콘서트 상태를 덮어쓰지 않는다", async () => {
    let rejectFirst!: (reason: Error) => void;
    mockGet
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce({ data: { data: { concert: { ...initialValues, title: "2번 콘서트" } } }, error: undefined, response: { ok: true } });

    mockUseParams.mockReturnValue({ concertId: "1" });
    const { result, rerender } = renderHook(() => useConcertEdit());

    mockUseParams.mockReturnValue({ concertId: "2" });
    rerender();

    await waitFor(() => expect(result.current.loadState).toEqual({ status: "success", data: { ...initialValues, title: "2번 콘서트" } }));

    await act(async () => {
      rejectFirst(new Error("network"));
    });
    expect(result.current.loadState).toEqual({ status: "success", data: { ...initialValues, title: "2번 콘서트" } });
  });

  it("변경된 값만 수정하고 목록으로 이동한다", async () => {
    mockPatch.mockResolvedValue({ error: undefined, response: { ok: true } });
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));

    await act(() => result.current.handleSubmit({ ...initialValues, title: "수정 공연" }));

    expect(mockPatch).toHaveBeenCalledWith("/api/concerts/{id}", {
      params: { path: { id: 3 } },
      body: { title: "수정 공연" },
    });
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
  });

  it("수정 실패 응답을 제출 오류 상태로 제공한다", async () => {
    mockPatch.mockResolvedValueOnce({ error: { message: "fail" }, response: { ok: false } });
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));

    await act(() => result.current.handleSubmit(changedValues));
    expect(result.current.submitState).toEqual({ status: "error", error: "콘서트 수정에 실패했습니다." });
  });

  it("수정 요청 중 예외가 발생하면 제출 오류 상태로 제공한다", async () => {
    mockPatch.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));

    await act(() => result.current.handleSubmit(changedValues));
    expect(result.current.submitState).toEqual({ status: "error", error: "콘서트 수정 중 오류가 발생했습니다." });
  });

  it("변경된 내용이 없으면 요청하지 않고 오류 상태를 제공한다", async () => {
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));

    await act(() => result.current.handleSubmit(initialValues));
    expect(mockPatch).not.toHaveBeenCalled();
    expect(result.current.submitState).toEqual({ status: "error", error: "변경된 내용이 없습니다." });
  });

  it("취소하면 콘서트 목록으로 이동한다", async () => {
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));
    act(() => result.current.handleCancel());
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
  });
});
