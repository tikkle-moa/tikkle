import { renderHook } from "@testing-library/react";

import { useVenueDetail } from "@pages/venue-detail/model/use-venue-detail";

const { mockUseParams, mockUseVenueDetail } = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseVenueDetail: vi.fn(),
}));

vi.mock("react-router", () => ({
  useParams: mockUseParams,
}));

vi.mock("@entities/venue", () => ({
  useVenueDetail: mockUseVenueDetail,
}));

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

describe("useVenueDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({ venueId: "1" });
    mockUseVenueDetail.mockReturnValue({
      data: { venue, venueSeats },
      isPending: false,
      isError: false,
    });
  });

  it("URL ID로 공연장 상세를 조회한다", () => {
    const { result } = renderHook(() => useVenueDetail());

    expect(mockUseVenueDetail).toHaveBeenCalledWith(1);
    expect(result.current).toEqual({
      isParamValid: true,
      venue,
      venueSeats,
      isPending: false,
      isError: false,
    });
  });

  it("잘못된 ID는 유효하지 않은 상태로 처리한다", () => {
    mockUseParams.mockReturnValue({ venueId: "invalid" });

    const { result } = renderHook(() => useVenueDetail());

    expect(Number.isNaN(mockUseVenueDetail.mock.calls[0][0])).toBe(true);
    expect(result.current.isParamValid).toBe(false);
  });

  it("공연장 조회 중에는 로딩 상태를 반환한다", () => {
    mockUseVenueDetail.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    const { result } = renderHook(() => useVenueDetail());

    expect(result.current.isPending).toBe(true);
  });

  it("공연장 조회 실패 상태를 반환한다", () => {
    mockUseVenueDetail.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    const { result } = renderHook(() => useVenueDetail());

    expect(result.current.isError).toBe(true);
  });
});
