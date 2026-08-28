import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useConcertNew } from "@pages/concert-new/model/use-concert-new";

const { mockNavigate, mockPost, mockRemoveQueries } = vi.hoisted(() => ({ mockNavigate: vi.fn(), mockPost: vi.fn(), mockRemoveQueries: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    removeQueries: mockRemoveQueries,
  }),
}));
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
vi.mock("@shared/api", () => ({ apiClient: { POST: mockPost } }));

const values = { venueId: 1, title: "공연", genre: "INDIE" as const, posterUrl: null, description: null };

describe("useConcertNew", () => {
  beforeEach(() => vi.clearAllMocks());

  it("콘서트를 등록하고 회차 등록 페이지로 이동한다", async () => {
    mockPost.mockResolvedValue({
      data: { data: { id: 21 } },
      error: undefined,
      response: { ok: true },
    });

    const { result } = renderHook(() => useConcertNew());

    await act(() => result.current.handleSubmit(values));

    expect(mockPost).toHaveBeenCalledWith("/api/concerts", { body: values });
    expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ["concerts"] });
    expect(mockNavigate).toHaveBeenCalledWith("/concerts/21/performances/new", {
      replace: true,
    });
    expect(result.current.submitState).toEqual({ status: "submitting" });
  });

  it("API 응답이 실패하면 등록 실패 오류를 표시한다", async () => {
    mockPost.mockResolvedValue({ response: { ok: false } });
    const { result } = renderHook(() => useConcertNew());

    await act(() => result.current.handleSubmit(values));

    expect(result.current.submitState).toEqual({ status: "error", error: "콘서트 등록에 실패했습니다." });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("요청 중 예외가 발생하면 오류를 표시한다", async () => {
    mockPost.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useConcertNew());

    await act(() => result.current.handleSubmit(values));

    expect(result.current.submitState).toEqual({ status: "error", error: "콘서트 등록 중 오류가 발생했습니다." });
  });

  it("취소하면 콘서트 목록으로 이동한다", () => {
    const { result } = renderHook(() => useConcertNew());
    act(() => result.current.handleCancel());
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.CONCERT_LIST);
  });
});
