import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useConcertNew } from "@pages/concert-new/model/use-concert-new";

const { mockNavigate, mockPost } = vi.hoisted(() => ({ mockNavigate: vi.fn(), mockPost: vi.fn() }));

vi.mock("react-router", () => ({ useNavigate: () => mockNavigate }));
vi.mock("@shared/api", () => ({ apiClient: { POST: mockPost } }));

const values = { title: "공연", genre: "INDIE" as const, placeName: "공연장", posterUrl: null, description: null };

describe("useConcertNew", () => {
  beforeEach(() => vi.clearAllMocks());

  it("콘서트를 등록하고 목록으로 이동한다", async () => {
    mockPost.mockResolvedValue({ response: { ok: true } });
    const { result } = renderHook(() => useConcertNew());

    await act(() => result.current.handleSubmit(values));

    expect(mockPost).toHaveBeenCalledWith("/api/concerts", { body: values });
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBeNull();
  });

  it("API 응답이 실패하면 등록 실패 오류를 표시한다", async () => {
    mockPost.mockResolvedValue({ response: { ok: false } });
    const { result } = renderHook(() => useConcertNew());

    await act(() => result.current.handleSubmit(values));

    expect(result.current.submitError).toBe("콘서트 등록에 실패했습니다.");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("요청 중 예외가 발생하면 오류를 표시한다", async () => {
    mockPost.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useConcertNew());

    await act(() => result.current.handleSubmit(values));

    expect(result.current.submitError).toBe("콘서트 등록 중 오류가 발생했습니다.");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("취소하면 콘서트 목록으로 이동한다", () => {
    const { result } = renderHook(() => useConcertNew());
    act(() => result.current.handleCancel());
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
  });
});
