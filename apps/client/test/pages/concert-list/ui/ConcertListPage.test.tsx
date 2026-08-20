import { MemoryRouter } from "react-router";

import { render, screen, within } from "@testing-library/react";

import ConcertListPage from "@pages/concert-list/ui/ConcertListPage";

const { mockUseConcertList, mockConcerts } = vi.hoisted(() => ({
  mockUseConcertList: vi.fn(),
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

vi.mock("@pages/concert-list/model/use-concert-list", () => ({
  useConcertList: mockUseConcertList,
}));

const renderConcertListPage = () =>
  render(
    <MemoryRouter>
      <ConcertListPage />
    </MemoryRouter>,
  );

const createConcertListResult = (overrides = {}) => ({
  isAdmin: false,
  concerts: mockConcerts,
  isPending: false,
  isError: false,
  filter: {
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
  },
  mobileFilter: {
    isMobileFilterOpen: false,
    toggleMobileFilter: vi.fn(),
  },
  ...overrides,
});

describe("ConcertListPage", () => {
  beforeEach(() => {
    mockUseConcertList.mockReturnValue(createConcertListResult());
  });

  it("정상 상태에서 모든 공연 카드를 그리드에 렌더링한다", () => {
    renderConcertListPage();

    const grid = screen.getByTestId("concert-list-grid");

    expect(screen.getByRole("heading", { name: "공연 목록" })).toBeInTheDocument();
    expect(within(grid).getAllByTestId("concert-card")).toHaveLength(mockConcerts.length);
  });

  it("로딩 중이면 카드 스켈레톤을 렌더링한다", () => {
    mockUseConcertList.mockReturnValue(
      createConcertListResult({
        concerts: [],
        isPending: true,
      }),
    );

    const { container } = renderConcertListPage();

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("concert-list-grid")).not.toBeInTheDocument();
  });

  it("오류 상태이면 오류 메시지를 렌더링한다", () => {
    mockUseConcertList.mockReturnValue(
      createConcertListResult({
        concerts: [],
        isError: true,
      }),
    );

    renderConcertListPage();

    expect(screen.getByText("공연 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("공연 목록이 비어 있으면 빈 상태 메시지를 렌더링한다", () => {
    mockUseConcertList.mockReturnValue(
      createConcertListResult({
        concerts: [],
      }),
    );

    renderConcertListPage();

    expect(screen.getByText("등록된 공연이 없습니다.")).toBeInTheDocument();
  });

  it("모바일 필터가 열려 있으면 모바일 필터 패널을 렌더링한다", () => {
    mockUseConcertList.mockReturnValue(
      createConcertListResult({
        mobileFilter: {
          isMobileFilterOpen: true,
          toggleMobileFilter: vi.fn(),
        },
      }),
    );

    const { container } = renderConcertListPage();

    expect(container.querySelector("#mobile-concert-list-filter-panel")).toBeInTheDocument();
  });

  it("관리자에게 콘서트 등록 링크를 렌더링한다", () => {
    mockUseConcertList.mockReturnValue(
      createConcertListResult({
        isAdmin: true,
      }),
    );

    renderConcertListPage();

    expect(screen.getByRole("link", { name: "콘서트 등록" })).toBeInTheDocument();
  });
});
