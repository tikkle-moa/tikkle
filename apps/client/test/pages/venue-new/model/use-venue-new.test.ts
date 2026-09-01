import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { CreateVenueDetailRequest } from "@entities/venue";

import { useVenueNew } from "@pages/venue-new/model/use-venue-new";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), post: vi.fn(), invalidateQueries: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }) }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@shared/api", () => ({ apiClient: { POST: mocks.post } }));
vi.mock("react-hot-toast", () => ({ default: { success: mocks.toastSuccess } }));

const values = {
  venue: { name: "공연장" },
  venueSeats: [],
} as unknown as CreateVenueDetailRequest;

describe("useVenueNew", () => {
  beforeEach(() => vi.clearAllMocks());

  it("공연장을 등록하고 목록으로 이동한다", async () => {
    mocks.post.mockResolvedValue({ data: { data: { id: 1 } }, response: { ok: true } });
    const { result } = renderHook(() => useVenueNew());
    await act(() => result.current.handleSubmit(values));
    expect(mocks.post).toHaveBeenCalledWith("/api/venues", { body: values });
    expect(mocks.invalidateQueries).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('"공연장" 공연장이 등록되었습니다.');
    expect(mocks.navigate).toHaveBeenCalledWith(ROUTE_PATHS.VENUE_LIST, { replace: true });
  });

  it.each([[{ response: { ok: false } }], [{ response: { ok: true }, error: { message: "error" } }], [{ response: { ok: true }, data: null }]])(
    "실패 응답이면 등록 오류를 표시한다",
    async (response) => {
      mocks.post.mockResolvedValue(response);
      const { result } = renderHook(() => useVenueNew());
      await act(() => result.current.handleSubmit(values));
      expect(result.current.submitState).toEqual({ status: "error", error: "공연장 등록에 실패했습니다. 입력 정보를 확인해 주세요." });
    },
  );

  it("요청 예외를 처리한다", async () => {
    mocks.post.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useVenueNew());
    await act(() => result.current.handleSubmit(values));
    expect(result.current.submitState).toEqual({ status: "error", error: "공연장 등록 중 오류가 발생했습니다." });
  });

  it("취소하면 목록으로 이동한다", () => {
    const { result } = renderHook(() => useVenueNew());
    act(() => result.current.handleCancel());
    expect(mocks.navigate).toHaveBeenCalledWith(ROUTE_PATHS.VENUE_LIST);
  });
});
