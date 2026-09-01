import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { formatDateTime } from "@shared/lib/date.utils";

import PerformanceDetailPage from "@pages/performance-detail/ui/PerformanceDetailPage";

const { mockUsePerformanceDetail } = vi.hoisted(() => ({
  mockUsePerformanceDetail: vi.fn(),
}));

vi.mock("@pages/performance-detail/model/use-performance-detail", () => ({
  usePerformanceDetail: mockUsePerformanceDetail,
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

const pageState = {
  performance: {
    id: 1,
    concertId: 10,
    venueId: 1,
    name: "Tikkle Live",
    startsAt: "2026-09-01T19:00:00",
    bookingOpensAt: "2026-08-28T14:00:00",
    createdAt: "2026-08-25T12:00:00",
    status: "UPCOMING",
  },
  venue,
  seats: [],
  isError: false,
  isParamValid: true,
  isPending: false,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <PerformanceDetailPage />
    </MemoryRouter>,
  );

describe("PerformanceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePerformanceDetail.mockReturnValue(pageState);
  });

  it("공연 회차와 예매 오픈 일시를 표시한다", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Tikkle Live" })).toBeInTheDocument();
    expect(screen.getByText("공연 일정과 좌석 배치 정보를 확인해 보세요.")).toBeInTheDocument();
    expect(screen.getByText("공연 일시").closest("dl")).toHaveClass("sm:grid-cols-2", "md:min-w-124");
    expect(screen.getByText(formatDateTime(pageState.performance.startsAt))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "콘서트 상세로 돌아가기" })).toHaveAttribute("href", "/concerts/10");
    expect(screen.getByRole("heading", { name: "좌석 배치 정보" })).toBeInTheDocument();
    expect(screen.getByText("올림픽공원 KSPO DOME · 전체 0석")).toBeInTheDocument();
    expect(screen.getByText("Option + 스크롤 또는 두 손가락으로 확대할 수 있습니다. 확대 후 드래그하여 이동하세요.")).toBeInTheDocument();
  });

  it("예매 오픈 일시가 없으면 예매 오픈 정보를 표시하지 않는다", () => {
    mockUsePerformanceDetail.mockReturnValue({
      ...pageState,
      performance: { ...pageState.performance, bookingOpensAt: null },
    });

    renderPage();

    expect(screen.queryByText("예매 오픈")).not.toBeInTheDocument();
    expect(screen.getByText("공연 일시").closest("dl")).toHaveClass("md:w-60");
  });

  it("오픈 예정 상태가 아니면 예매 오픈 정보를 표시하지 않는다", () => {
    mockUsePerformanceDetail.mockReturnValue({
      ...pageState,
      performance: { ...pageState.performance, bookingOpensAt: "2026-08-20T14:00:00", status: "AVAILABLE" },
    });

    renderPage();

    expect(screen.queryByText("예매 오픈")).not.toBeInTheDocument();
  });

  it("종료된 회차에 직접 접근하면 종료 안내를 표시한다", () => {
    mockUsePerformanceDetail.mockReturnValue({
      ...pageState,
      performance: { ...pageState.performance, status: "ENDED" },
    });

    renderPage();

    expect(screen.getByRole("heading", { name: "종료된 공연 회차입니다." })).toBeInTheDocument();
    expect(screen.getByText("다른 회차를 선택해 주세요.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "좌석 배치 정보" })).not.toBeInTheDocument();
  });

  it("잘못된 ID이면 안내 메시지를 표시한다", () => {
    mockUsePerformanceDetail.mockReturnValue({ ...pageState, isParamValid: false });

    renderPage();

    expect(screen.getByRole("heading", { name: "잘못된 공연 회차입니다." })).toBeInTheDocument();
  });

  it("로딩 중이면 스켈레톤을 표시한다", () => {
    mockUsePerformanceDetail.mockReturnValue({ ...pageState, performance: undefined, isPending: true });

    renderPage();

    expect(screen.getByLabelText("공연 회차 상세 정보를 불러오는 중")).toBeInTheDocument();
  });

  it("조회 오류이면 안내 메시지를 표시한다", () => {
    mockUsePerformanceDetail.mockReturnValue({ ...pageState, performance: undefined, isError: true });

    renderPage();

    expect(screen.getByRole("heading", { name: "공연 회차를 불러오지 못했습니다." })).toBeInTheDocument();
  });
});
