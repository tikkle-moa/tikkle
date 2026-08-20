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

describe("useConcertEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUseParams.mockReturnValue({ concertId: "3" });
    mockGet.mockResolvedValue({ data: { data: { concert: initialValues } }, error: undefined, response: { ok: true } });
  });

  afterEach(() => vi.restoreAllMocks());

  it("유효하지 않은 ID이면 조회하지 않는다", () => {
    mockUseParams.mockReturnValue({ concertId: "invalid" });
    const { result } = renderHook(() => useConcertEdit());

    expect(result.current.isParamValid).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("콘서트 정보를 조회해 초기값으로 제공한다", async () => {
    const { result } = renderHook(() => useConcertEdit());

    await waitFor(() => expect(result.current.initialValues).toEqual(initialValues));
    expect(mockGet).toHaveBeenCalledWith("/api/concerts/{id}", { params: { path: { id: 3 } } });
  });

  it("조회 실패 응답과 예외를 처리한다", async () => {
    mockGet.mockResolvedValueOnce({ error: { message: "fail" }, response: { ok: false } });
    const { result, unmount } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current.initialValues).toBeNull();
    unmount();

    mockGet.mockRejectedValueOnce(new Error("network"));
    renderHook(() => useConcertEdit());
    await waitFor(() => expect(console.error).toHaveBeenCalledWith(expect.any(Error)));
  });

  it("변경된 값만 수정하고 목록으로 이동한다", async () => {
    mockPatch.mockResolvedValue({ error: undefined, response: { ok: true } });
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.initialValues).toEqual(initialValues));

    await act(() => result.current.handleSubmit({ ...initialValues, title: "수정 공연" }));

    expect(mockPatch).toHaveBeenCalledWith("/api/concerts/{id}", {
      params: { path: { id: 3 } },
      body: { title: "수정 공연" },
    });
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("수정 실패 응답과 요청 예외를 표시한다", async () => {
    mockPatch.mockResolvedValueOnce({ error: { message: "fail" }, response: { ok: false } });
    const { result } = renderHook(() => useConcertEdit());
    await waitFor(() => expect(result.current.initialValues).toEqual(initialValues));
    await act(() => result.current.handleSubmit(initialValues));
    expect(result.current.submitError).toBe("콘서트 수정에 실패했습니다.");

    mockPatch.mockRejectedValueOnce(new Error("network"));
    await act(() => result.current.handleSubmit(initialValues));
    expect(result.current.submitError).toBe("콘서트 등록 중 오류가 발생했습니다.");
  });

  it("취소하면 콘서트 목록으로 이동한다", () => {
    const { result } = renderHook(() => useConcertEdit());
    act(() => result.current.handleCancel());
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
  });
});
