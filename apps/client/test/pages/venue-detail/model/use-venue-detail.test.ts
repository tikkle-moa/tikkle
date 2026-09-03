import { act, renderHook } from "@testing-library/react";

import { useVenueDetail } from "@pages/venue-detail/model/use-venue-detail";

const { mockDelete, mockInvalidateQueries, mockNavigate, mockToastError, mockToastSuccess, mockUseParams, mockUseSessionStore, mockUseVenueDetail } =
  vi.hoisted(() => ({
    mockDelete: vi.fn(),
    mockInvalidateQueries: vi.fn(),
    mockNavigate: vi.fn(),
    mockToastError: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockUseParams: vi.fn(),
    mockUseSessionStore: vi.fn(),
    mockUseVenueDetail: vi.fn(),
  }));

vi.mock("react-hot-toast", () => ({ default: { error: mockToastError, success: mockToastSuccess } }));
vi.mock("react-router", () => ({ useNavigate: () => mockNavigate, useParams: mockUseParams }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }) }));
vi.mock("@shared/api", () => ({ apiClient: { DELETE: mockDelete } }));
vi.mock("@entities/session", () => ({ USER_ROLE: { ADMIN: "ADMIN" }, useSessionStore: mockUseSessionStore }));
vi.mock("@entities/venue", () => ({ VENUE_QUERY_KEYS: { all: ["venues"] }, useVenueDetail: mockUseVenueDetail }));

const venue = {
  id: 1,
  name: "올림픽공원 KSPO DOME",
  address: "서울특별시 송파구 올림픽로 424",
  description: "가상 공연장 좌석 배치도입니다.",
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 72,
  stageHeight: 13,
  createdAt: "2026-08-25T12:00:00",
};

const venueSeats = [
  {
    id: 1,
    venueId: 1,
    sectionName: "A구역",
    seatNumber: 1,
    seatLabel: "A구역 1열 1번",
    price: 150000,
    positionX: 20,
    positionY: 28,
    createdAt: "2026-08-25T12:00:00",
  },
];

describe("useVenueDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ venueId: "1" });
    mockUseSessionStore.mockImplementation((selector) => selector({ user: { role: "ADMIN" } }));
    mockUseVenueDetail.mockReturnValue({ data: { venue, venueSeats }, isPending: false, isError: false });
    mockDelete.mockResolvedValue({ data: { success: true }, error: undefined, response: { ok: true } });
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it("URL ID로 공연장 상세와 관리자 상태를 조회한다", () => {
    const { result } = renderHook(() => useVenueDetail());

    expect(mockUseVenueDetail).toHaveBeenCalledWith(1);
    expect(result.current).toMatchObject({ isParamValid: true, isAdmin: true, venue, venueSeats, isPending: false, isError: false });
    expect(result.current.handleDelete).toEqual(expect.any(Function));
  });

  it("잘못된 ID는 유효하지 않은 상태로 처리한다", () => {
    mockUseParams.mockReturnValue({ venueId: "invalid" });
    const { result } = renderHook(() => useVenueDetail());

    expect(Number.isNaN(mockUseVenueDetail.mock.calls[0][0])).toBe(true);
    expect(result.current.isParamValid).toBe(false);
  });

  it("조회 상태와 빈 좌석 기본값을 반환한다", () => {
    mockUseVenueDetail.mockReturnValue({ data: { venue }, isPending: true, isError: true });
    const { result } = renderHook(() => useVenueDetail());

    expect(result.current).toMatchObject({ venue, venueSeats: [], isPending: true, isError: true });
  });

  it("공연장을 삭제하고 목록으로 이동한다", async () => {
    const { result } = renderHook(() => useVenueDetail());
    await act(result.current.handleDelete);

    expect(mockDelete).toHaveBeenCalledWith("/api/venues/{id}", { params: { path: { id: 1 } } });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["venues"] });
    expect(mockToastSuccess).toHaveBeenCalledWith("공연장이 삭제되었습니다.");
    expect(mockNavigate).toHaveBeenCalledWith("/venues");
  });

  it.each([
    { data: undefined, error: undefined, response: { ok: true } },
    { data: { success: true }, error: { message: "error" }, response: { ok: true } },
    { data: { success: true }, error: undefined, response: { ok: false } },
  ])("삭제 응답이 올바르지 않으면 오류를 알린다", async (response) => {
    mockDelete.mockResolvedValue(response);
    const { result } = renderHook(() => useVenueDetail());
    await act(result.current.handleDelete);

    expect(mockToastError).toHaveBeenCalledWith("공연장 삭제에 실패했습니다.\n연결된 공연이 있는지 확인해주세요.");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("삭제 요청에서 예외가 발생하면 오류를 알린다", async () => {
    mockDelete.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useVenueDetail());
    await act(result.current.handleDelete);

    expect(mockToastError).toHaveBeenCalled();
  });
});
