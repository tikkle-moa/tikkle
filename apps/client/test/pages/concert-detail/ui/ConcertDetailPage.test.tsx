import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import type { ConcertDetailResponse } from "@pages/concert-detail/model/concert-detail.types";
import ConcertDetailPage from "@pages/concert-detail/ui/ConcertDetailPage";

const { mockUseConcertDetailQuery, mockUseParams } = vi.hoisted(() => ({
  mockUseConcertDetailQuery: vi.fn(),
  mockUseParams: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return {
    ...actual,
    useParams: mockUseParams,
  };
});

vi.mock("@pages/concert-detail/model/use-concert-detail-query", () => ({
  useConcertDetailQuery: mockUseConcertDetailQuery,
}));

vi.mock("@pages/concert-detail/ui/ConcertDetailMessage", () => ({
  default: ({ title, description }: { title: string; description: string }) => (
    <output data-testid="concert-detail-message">
      {title} {description}
    </output>
  ),
}));

vi.mock("@pages/concert-detail/ui/ConcertDetailSkeleton", () => ({
  default: () => <output data-testid="concert-detail-skeleton" />,
}));

vi.mock("@pages/concert-detail/ui/PerformanceBookingPanel", () => ({
  default: ({ performances }: { performances: unknown[] }) => <output data-testid="performance-booking-panel">{performances.length}</output>,
}));

const makeUser = (role: User["role"]): User => ({
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role,
  oauthAccounts: ["google"],
});

const renderConcertDetailPage = () =>
  render(
    <MemoryRouter>
      <ConcertDetailPage />
    </MemoryRouter>,
  );

const makeConcertDetail = (overrides: Partial<ConcertDetailResponse> = {}): ConcertDetailResponse => ({
  concert: {
    id: 1,
    title: "테스트 콘서트",
    genre: "INDIE",
    placeName: "테스트 공연장",
    posterUrl: null,
    description: "테스트 공연 소개",
    createdAt: "2026-08-23T12:00:00",
  },
  performances: [],
  ...overrides,
});

describe("ConcertDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({
      user: null,
      status: "unauthenticated",
      justLoggedOut: false,
    });
    mockUseParams.mockReturnValue({ concertId: "1" });
    mockUseConcertDetailQuery.mockReturnValue({
      data: makeConcertDetail(),
      isPending: false,
      isError: false,
    });
  });

  it("관리자에게 콘서트 수정 링크를 표시한다", () => {
    useSessionStore.setState({
      user: makeUser(USER_ROLE.ADMIN),
      status: "authenticated",
    });

    renderConcertDetailPage();

    expect(screen.getByRole("link", { name: "테스트 콘서트 수정" })).toHaveAttribute("href", "/concerts/1/edit");
  });

  it("관리자가 아닌 사용자에게는 콘서트 수정 링크를 표시하지 않는다", () => {
    useSessionStore.setState({
      user: makeUser(USER_ROLE.USER),
      status: "authenticated",
    });

    renderConcertDetailPage();

    expect(screen.queryByRole("link", { name: "테스트 콘서트 수정" })).not.toBeInTheDocument();
  });

  it("잘못된 콘서트 ID이면 안내 메시지를 표시한다", () => {
    mockUseParams.mockReturnValue({ concertId: "invalid" });

    renderConcertDetailPage();

    expect(screen.getByTestId("concert-detail-message")).toHaveTextContent("잘못된 공연입니다. 올바르지 않은 콘서트 ID입니다.");
  });

  it("로딩 중이면 스켈레톤을 표시한다", () => {
    mockUseConcertDetailQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    renderConcertDetailPage();

    expect(screen.getByTestId("concert-detail-skeleton")).toBeInTheDocument();
  });

  it("404 응답이면 존재하지 않는 공연 안내를 표시한다", () => {
    mockUseConcertDetailQuery.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
    });

    renderConcertDetailPage();

    expect(screen.getByTestId("concert-detail-message")).toHaveTextContent("존재하지 않는 공연입니다. 다른 공연을 둘러보세요.");
  });

  it("조회 오류이면 오류 안내를 표시한다", () => {
    mockUseConcertDetailQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    renderConcertDetailPage();

    expect(screen.getByTestId("concert-detail-message")).toHaveTextContent("공연 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("응답 데이터가 없으면 오류 안내를 표시한다", () => {
    mockUseConcertDetailQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    });

    renderConcertDetailPage();

    expect(screen.getByTestId("concert-detail-message")).toHaveTextContent("공연 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("상세 정보와 회차 패널에 필요한 데이터를 전달한다", () => {
    const detail = makeConcertDetail({
      concert: {
        ...makeConcertDetail().concert,
        posterUrl: "https://example.com/poster.jpg",
      },
      performances: [
        {
          id: 1,
          concertId: 1,
          startsAt: "2026-09-01T19:00:00",
          bookingOpensAt: null,
          createdAt: "2026-08-23T12:00:00",
        },
      ],
    });

    mockUseConcertDetailQuery.mockReturnValue({
      data: detail,
      isPending: false,
      isError: false,
    });

    renderConcertDetailPage();

    expect(screen.getByRole("img", { name: "테스트 콘서트" })).toHaveAttribute("src", "https://example.com/poster.jpg");
    expect(screen.getByRole("heading", { name: "테스트 콘서트" })).toBeInTheDocument();
    expect(screen.getByText("테스트 공연장")).toBeInTheDocument();
    expect(screen.getByText("테스트 공연 소개")).toBeInTheDocument();
    expect(screen.getByTestId("performance-booking-panel")).toHaveTextContent("1");
  });

  it("포스터와 설명이 없으면 대체 UI를 표시한다", () => {
    mockUseConcertDetailQuery.mockReturnValue({
      data: makeConcertDetail({
        concert: {
          ...makeConcertDetail().concert,
          description: null,
          posterUrl: null,
        },
      }),
      isPending: false,
      isError: false,
    });

    renderConcertDetailPage();

    expect(screen.queryByRole("img", { name: "테스트 콘서트" })).not.toBeInTheDocument();
    expect(screen.getByText("공연 상세 정보를 준비 중입니다.")).toBeInTheDocument();
    expect(screen.getByTestId("performance-booking-panel")).toHaveTextContent("0");
  });
});
