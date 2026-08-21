import { renderHook } from "@testing-library/react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import { useConcertList } from "@pages/concert-list/model/use-concert-list";

const { mockUseConcerts, mockUseConcertListFilterSearchParams, mockUseMobileConcertListFilterToggle } = vi.hoisted(() => ({
  mockUseConcerts: vi.fn(),
  mockUseConcertListFilterSearchParams: vi.fn(),
  mockUseMobileConcertListFilterToggle: vi.fn(),
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();

  return {
    ...actual,
    useConcerts: mockUseConcerts,
  };
});

vi.mock("@pages/concert-list/model/use-concert-list-filter-search-params", () => ({
  useConcertListFilterSearchParams: mockUseConcertListFilterSearchParams,
}));

vi.mock("@pages/concert-list/model/use-mobile-concert-list-filter-toggle", () => ({
  useMobileConcertListFilterToggle: mockUseMobileConcertListFilterToggle,
}));

const makeUser = (role: User["role"]): User => ({
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role,
  oauthAccounts: ["google"],
});

describe("useConcertList", () => {
  beforeEach(() => {
    useSessionStore.setState({
      user: null,
      status: "loading",
      justLoggedOut: false,
    });
  });

  it("목록 조회·필터·모바일 필터 상태를 페이지에 제공한다", () => {
    const filter = {
      selectedGenres: ["BALLAD"],
      selectedBookingStatuses: ["available"],
      startDate: "2026-08-20",
      endDate: "",
      activeFilterCount: 3,
      toggleGenre: vi.fn(),
      toggleBookingStatus: vi.fn(),
      changeStartDate: vi.fn(),
      changeEndDate: vi.fn(),
      clearFilters: vi.fn(),
    };
    const mobileFilter = {
      isMobileFilterOpen: true,
      toggleMobileFilter: vi.fn(),
    };
    const concerts = [{ id: 1 }];

    mockUseConcerts.mockReturnValue({
      data: concerts,
      isPending: false,
      isError: false,
    });
    mockUseConcertListFilterSearchParams.mockReturnValue(filter);
    mockUseMobileConcertListFilterToggle.mockReturnValue(mobileFilter);

    const { result } = renderHook(() => useConcertList());

    expect(result.current).toMatchObject({
      isAdmin: false,
      concerts,
      isPending: false,
      isError: false,
      filter,
      mobileFilter,
    });
  });

  it("관리자 사용자를 관리자 상태로 제공한다", () => {
    useSessionStore.setState({
      user: makeUser(USER_ROLE.ADMIN),
      status: "authenticated",
    });
    mockUseConcerts.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });
    mockUseConcertListFilterSearchParams.mockReturnValue({});
    mockUseMobileConcertListFilterToggle.mockReturnValue({});

    const { result } = renderHook(() => useConcertList());

    expect(result.current.isAdmin).toBe(true);
  });
});
