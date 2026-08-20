import { MemoryRouter } from "react-router";

import { render, screen, within } from "@testing-library/react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import ConcertListPage from "@pages/concert-list/ui/ConcertListPage";

const makeUser = (role: User["role"]): User => ({
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role,
  oauthAccounts: ["google"],
});

const renderConcertListPage = () => {
  return render(
    <MemoryRouter>
      <ConcertListPage />
    </MemoryRouter>,
  );
};

const { mockUseConcerts, mockUseConcertListFilterSearchParams, mockUseMobileConcertListFilterToggle, mockConcerts } = vi.hoisted(() => ({
  mockUseConcerts: vi.fn(),
  mockUseConcertListFilterSearchParams: vi.fn(),
  mockUseMobileConcertListFilterToggle: vi.fn(),
  mockConcerts: [
    {
      id: 1,
      title: "테스트 콘서트 1",
      genre: "BALLAD" as const,
      placeName: "올림픽공원",
      posterUrl: "https://example.com/1.jpg",
      createdAt: new Date("2026-01-01"),
      performances: [
        {
          id: 1,
          concertId: 1,
          startsAt: new Date("2099-01-01"),
          bookingOpensAt: new Date("2000-01-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 100,
          bookedSeats: 50,
        },
      ],
    },
    {
      id: 2,
      title: "테스트 콘서트 2",
      genre: "ROCK_METAL" as const,
      placeName: "잠실실내체육관",
      posterUrl: "https://example.com/2.jpg",
      createdAt: new Date("2026-01-01"),
      performances: [
        {
          id: 2,
          concertId: 2,
          startsAt: new Date("2099-02-01"),
          bookingOpensAt: new Date("2099-01-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 100,
          bookedSeats: 0,
        },
      ],
    },
  ],
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();

  return {
    ...actual,
    useConcerts: mockUseConcerts,
  };
});

vi.mock("@features/concert-filter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/concert-filter")>();

  return {
    ...actual,
    useConcertListFilterSearchParams: mockUseConcertListFilterSearchParams,
    useMobileConcertListFilterToggle: mockUseMobileConcertListFilterToggle,
  };
});

describe("ConcertListPage", () => {
  beforeEach(() => {
    mockUseConcertListFilterSearchParams.mockReturnValue({
      selectedGenres: [],
      selectedBookingStatuses: [],
      startDate: "",
      endDate: "",
      activeFilterCount: 0,
      toggleGenre: vi.fn(),
      toggleBookingStatus: vi.fn(),
      changeStartDate: vi.fn(),
      changeEndDate: vi.fn(),
      clearFilters: vi.fn(),
    });

    mockUseMobileConcertListFilterToggle.mockReturnValue({
      isMobileFilterOpen: false,
      toggleMobileFilter: vi.fn(),
    });
  });

  afterEach(() => {
    useSessionStore.setState({
      user: null,
      status: "loading",
    });
  });

  it("정상 상태에서 모든 공연 카드를 그리드에 렌더링한다", () => {
    mockUseConcerts.mockReturnValue({
      data: mockConcerts,
      isPending: false,
      isError: false,
    });

    renderConcertListPage();

    const grid = screen.getByTestId("concert-list-grid");

    expect(screen.getByRole("heading", { name: "공연 목록" })).toBeInTheDocument();
    expect(within(grid).getAllByTestId("concert-card")).toHaveLength(mockConcerts.length);

    for (const { title } of mockConcerts) {
      expect(within(grid).getByText(title)).toBeInTheDocument();
    }
  });

  it("로딩 중이면 카드 스켈레톤을 렌더링한다", () => {
    mockUseConcerts.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    const { container } = renderConcertListPage();

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("concert-list-grid")).not.toBeInTheDocument();
  });

  it("오류 상태이면 오류 메시지를 렌더링한다", () => {
    mockUseConcerts.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    renderConcertListPage();

    expect(screen.getByText("공연 정보를 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.queryByTestId("concert-list-grid")).not.toBeInTheDocument();
  });

  it("공연 목록이 비어 있으면 빈 상태 메시지를 렌더링한다", () => {
    mockUseConcerts.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });

    renderConcertListPage();

    expect(screen.getByText("등록된 공연이 없습니다.")).toBeInTheDocument();
    expect(screen.queryByTestId("concert-list-grid")).not.toBeInTheDocument();
  });

  it("모바일 필터가 열려 있으면 모바일 필터 패널을 렌더링한다", () => {
    mockUseConcerts.mockReturnValue({
      data: mockConcerts,
      isPending: false,
      isError: false,
    });
    mockUseMobileConcertListFilterToggle.mockReturnValue({
      isMobileFilterOpen: true,
      toggleMobileFilter: vi.fn(),
    });

    const { container } = renderConcertListPage();
    const mobileFilterPanel = container.querySelector("#mobile-concert-list-filter-panel");

    expect(screen.getByRole("button", { name: "필터" })).toHaveAttribute("aria-expanded", "true");
    expect(mobileFilterPanel).toBeInTheDocument();

    const panel = within(mobileFilterPanel as HTMLElement);

    expect(panel.getByText("필터")).toBeInTheDocument();
    expect(panel.getByRole("heading", { name: "장르" })).toBeInTheDocument();
    expect(panel.getByRole("heading", { name: "상태" })).toBeInTheDocument();
    expect(panel.getByRole("heading", { name: "공연일" })).toBeInTheDocument();
  });

  it("관리자에게 콘서트 등록 링크를 렌더링한다", () => {
    useSessionStore.setState({
      user: makeUser(USER_ROLE.ADMIN),
      status: "authenticated",
    });
    mockUseConcerts.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });

    renderConcertListPage();

    expect(screen.getByRole("link", { name: "콘서트 등록" })).toBeInTheDocument();
  });
});
