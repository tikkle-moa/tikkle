import { act, renderHook, waitFor } from "@testing-library/react";

import type { VenueDetailResponse } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form";

import { useVenueEdit } from "@pages/venue-edit/model/use-venue-edit";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  navigate: vi.fn(),
  useParams: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }) }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => mocks.navigate,
  useParams: mocks.useParams,
}));
vi.mock("@shared/api", () => ({ apiClient: { GET: mocks.get, PATCH: mocks.patch } }));
vi.mock("react-hot-toast", () => ({ default: { success: mocks.toastSuccess } }));

const detail: VenueDetailResponse = {
  venue: {
    id: 3,
    name: "공연장",
    address: "서울",
    description: null,
    width: 100,
    height: 80,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 40,
    stageHeight: 10,
    createdAt: "2026-09-04T00:00:00Z",
  },
  venueSeats: [
    {
      id: 10,
      venueId: 3,
      sectionName: "A",
      seatNumber: 1,
      seatLabel: "A1",
      price: 10_000,
      positionX: 20,
      positionY: 30,
      createdAt: "2026-09-04T00:00:00Z",
    },
  ],
};
const venue = (({ id: _, createdAt: __, ...value }) => value)(detail.venue);
const seats: VenueFormSeat[] = [{ clientId: 10, sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 }];

describe("useVenueEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useParams.mockReturnValue({ venueId: "3" });
    mocks.get.mockResolvedValue({ data: { success: true, data: detail }, error: undefined, response: { ok: true } });
  });

  it("유효한 ID의 공연장 상세를 불러온다", async () => {
    const { result } = renderHook(() => useVenueEdit());
    await waitFor(() => expect(result.current.loadState).toEqual({ status: "success", data: detail }));
    expect(mocks.get).toHaveBeenCalledWith("/api/venues/{id}", { params: { path: { id: 3 } } });
  });

  it("잘못된 ID이면 조회하지 않고 오류를 표시한다", async () => {
    mocks.useParams.mockReturnValue({ venueId: "invalid" });
    const { result } = renderHook(() => useVenueEdit());
    await waitFor(() => expect(result.current.loadState).toEqual({ status: "error", error: "잘못된 공연장 ID입니다." }));
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it.each([
    [{ response: { ok: false }, error: undefined, data: undefined }],
    [{ response: { ok: true }, error: { message: "fail" }, data: undefined }],
    [{ response: { ok: true }, error: undefined, data: undefined }],
  ])("조회 실패 응답을 오류 상태로 제공한다", async (response) => {
    mocks.get.mockResolvedValue(response);
    const { result } = renderHook(() => useVenueEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("error"));
  });

  it("조회 예외를 오류 상태로 제공한다", async () => {
    mocks.get.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useVenueEdit());
    await waitFor(() => expect(result.current.loadState).toEqual({ status: "error", error: "공연장 정보를 불러오는 중 오류가 발생했습니다." }));
  });

  it("언마운트 후 완료된 조회 응답은 상태에 반영하지 않는다", async () => {
    let resolveRequest!: (value: unknown) => void;
    mocks.get.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));
    const { result, unmount } = renderHook(() => useVenueEdit());
    unmount();

    await act(() => resolveRequest({ data: { success: true, data: detail }, error: undefined, response: { ok: true } }));
    expect(result.current.loadState).toEqual({ status: "loading" });
  });

  it("언마운트 후 발생한 조회 예외는 상태에 반영하지 않는다", async () => {
    let rejectRequest!: (reason: unknown) => void;
    mocks.get.mockReturnValue(new Promise((_, reject) => (rejectRequest = reject)));
    const { result, unmount } = renderHook(() => useVenueEdit());
    unmount();

    await act(() => rejectRequest(new Error("network")));
    expect(result.current.loadState).toEqual({ status: "loading" });
  });

  it("변경된 공연장을 수정하고 캐시 무효화 후 상세로 이동한다", async () => {
    mocks.patch.mockResolvedValue({ data: { success: true, data: { venue: { id: 3 } } }, error: undefined, response: { ok: true } });
    const { result } = renderHook(() => useVenueEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));

    await act(() => result.current.handleSubmit({ ...venue, name: "수정 공연장" }, seats));

    expect(mocks.patch).toHaveBeenCalledWith("/api/venues/{id}", {
      params: { path: { id: 3 } },
      body: { venue: { name: "수정 공연장" } },
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["venues"] });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('"수정 공연장" 공연장 수정이 완료되었습니다.');
    expect(mocks.navigate).toHaveBeenCalledWith("/venues/3", { replace: true });
  });

  it("조회 전 제출과 변경 없는 제출을 거부한다", async () => {
    mocks.useParams.mockReturnValue({ venueId: "invalid" });
    const invalid = renderHook(() => useVenueEdit());
    await waitFor(() => expect(invalid.result.current.loadState.status).toBe("error"));
    await act(() => invalid.result.current.handleSubmit(venue, seats));
    expect(invalid.result.current.submitState).toEqual({ status: "error", error: "공연장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." });

    mocks.useParams.mockReturnValue({ venueId: "3" });
    const unchanged = renderHook(() => useVenueEdit());
    await waitFor(() => expect(unchanged.result.current.loadState.status).toBe("success"));
    await act(() => unchanged.result.current.handleSubmit(venue, seats));
    expect(unchanged.result.current.submitState).toEqual({ status: "error", error: "변경된 내용이 없습니다." });
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it.each([
    [{ response: { ok: false }, error: undefined, data: undefined }],
    [{ response: { ok: true }, error: { message: "fail" }, data: undefined }],
    [{ response: { ok: true }, error: undefined, data: undefined }],
  ])("수정 실패 응답을 오류 상태로 제공한다", async (response) => {
    mocks.patch.mockResolvedValue(response);
    const { result } = renderHook(() => useVenueEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));
    await act(() => result.current.handleSubmit({ ...venue, name: "수정" }, seats));
    expect(result.current.submitState).toEqual({ status: "error", error: "공연장 수정에 실패했습니다. 입력 정보를 확인해 주세요." });
  });

  it("수정 예외와 취소 이동을 처리한다", async () => {
    mocks.patch.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useVenueEdit());
    await waitFor(() => expect(result.current.loadState.status).toBe("success"));
    await act(() => result.current.handleSubmit({ ...venue, name: "수정" }, seats));
    expect(result.current.submitState).toEqual({ status: "error", error: "공연장 수정 중 오류가 발생했습니다." });
    act(() => result.current.handleCancel());
    expect(mocks.navigate).toHaveBeenCalledWith("/venues");
  });
});
