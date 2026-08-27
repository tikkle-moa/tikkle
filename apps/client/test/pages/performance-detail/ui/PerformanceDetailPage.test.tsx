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

const pageState = {
  performance: {
    id: 1,
    concertId: 10,
    name: "Tikkle Live",
    startsAt: "2026-09-01T19:00:00",
    bookingOpensAt: "2026-08-28T14:00:00",
    createdAt: "2026-08-25T12:00:00",
    status: "UPCOMING",
  },
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
    expect(screen.getByText("좌석 상태와 선택 기능은 추후 적용 예정입니다.")).toBeInTheDocument();
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
