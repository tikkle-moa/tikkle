import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import ConcertDetailPage from "@pages/concert-detail/ui/ConcertDetailPage";

const { mockUseConcertDetail } = vi.hoisted(() => ({
  mockUseConcertDetail: vi.fn(),
}));

vi.mock("@pages/concert-detail/model/use-concert-detail", () => ({
  useConcertDetail: mockUseConcertDetail,
}));

vi.mock("@pages/concert-detail/ui/ConcertDetailSkeleton", () => ({
  default: () => <output data-testid="concert-detail-skeleton" />,
}));

vi.mock("@pages/concert-detail/ui/PerformanceBookingPanel", () => ({
  default: ({ performances }: { performances: unknown[] }) => <output data-testid="performance-booking-panel">{performances.length}</output>,
}));

const renderConcertDetailPage = () =>
  render(
    <MemoryRouter>
      <ConcertDetailPage />
    </MemoryRouter>,
  );

const pageState = {
  concert: {
    id: 1,
    title: "테스트 콘서트",
    genre: "ROCK_METAL",
    placeName: "테스트 공연장",
    posterUrl: null,
    description: "테스트 설명",
  },
  performances: [],
  isAdmin: false,
  isError: false,
  isParamValid: true,
  isPending: false,
};

describe("ConcertDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConcertDetail.mockReturnValue(pageState);
  });

  it("관리자에게 콘서트 수정 링크를 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      ...pageState,
      isAdmin: true,
    });

    renderConcertDetailPage();

    expect(screen.getByRole("link", { name: "테스트 콘서트 수정" })).toHaveAttribute("href", "/concerts/1/edit");
  });

  it("관리자가 아닌 사용자에게는 콘서트 수정 링크를 표시하지 않는다", () => {
    mockUseConcertDetail.mockReturnValue(pageState);

    renderConcertDetailPage();

    expect(screen.queryByRole("link", { name: "테스트 콘서트 수정" })).not.toBeInTheDocument();
  });

  it("잘못된 콘서트 ID이면 안내 메시지를 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      ...pageState,
      isParamValid: false,
    });

    renderConcertDetailPage();

    expect(screen.getByRole("heading", { name: "잘못된 공연입니다." })).toBeInTheDocument();
    expect(screen.getByText("올바르지 않은 콘서트 ID입니다.")).toBeInTheDocument();
  });

  it("로딩 중이면 스켈레톤을 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      ...pageState,
      concert: undefined,
      isPending: true,
    });

    renderConcertDetailPage();

    expect(screen.getByTestId("concert-detail-skeleton")).toBeInTheDocument();
  });

  it("조회 오류이면 오류 안내를 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      ...pageState,
      concert: undefined,
      isError: true,
    });

    renderConcertDetailPage();

    expect(screen.getByRole("heading", { name: "공연 정보를 불러오지 못했습니다." })).toBeInTheDocument();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it("응답 데이터가 없으면 오류 안내를 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      ...pageState,
      concert: undefined,
    });

    renderConcertDetailPage();

    expect(screen.getByRole("heading", { name: "공연 정보를 불러오지 못했습니다." })).toBeInTheDocument();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it("상세 정보와 회차 패널에 필요한 데이터를 전달한다", () => {
    mockUseConcertDetail.mockReturnValue({
      ...pageState,
      concert: {
        ...pageState.concert,
        posterUrl: "https://example.com/poster.jpg",
      },
      performances: [{ id: 1, startsAt: "2026-09-01T19:00:00" }],
    });

    renderConcertDetailPage();

    expect(screen.getByRole("img", { name: "테스트 콘서트" })).toHaveAttribute("src", "https://example.com/poster.jpg");
    expect(screen.getByRole("heading", { name: "테스트 콘서트" })).toBeInTheDocument();
    expect(screen.getByText("테스트 공연장")).toBeInTheDocument();
    expect(screen.getByText("테스트 설명")).toBeInTheDocument();
    expect(screen.getByTestId("performance-booking-panel")).toHaveTextContent("1");
  });

  it("포스터와 설명이 없으면 대체 UI를 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      ...pageState,
      concert: {
        ...pageState.concert,
        description: null,
        posterUrl: null,
      },
    });

    renderConcertDetailPage();

    expect(screen.queryByRole("img", { name: "테스트 콘서트" })).not.toBeInTheDocument();
    expect(screen.getByText("콘서트 상세 정보를 준비 중입니다.")).toBeInTheDocument();
    expect(screen.getByTestId("performance-booking-panel")).toHaveTextContent("0");
  });
});
