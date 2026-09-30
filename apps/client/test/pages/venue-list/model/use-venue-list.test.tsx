import type { PropsWithChildren } from "react";
import { MemoryRouter } from "react-router";

import { renderHook } from "@testing-library/react";

import { useSessionStore } from "@entities/session";

import { useVenueList } from "@pages/venue-list/model/use-venue-list";

const mockUseVenues = vi.hoisted(() => vi.fn());
vi.mock("@entities/venue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@entities/venue")>()),
  useVenues: mockUseVenues,
}));

const venues = [
  { id: 1, name: "가 홀", address: "서울특별시 강남구", venueSeatCount: 100, concertCount: 3 },
  { id: 2, name: "나 아레나", address: "부산광역시 해운대구", venueSeatCount: 500, concertCount: 1 },
  { id: 3, name: "다 극장", address: "", venueSeatCount: 300, concertCount: 5 },
].map((venue) => ({
  ...venue,
  description: null,
  width: 100,
  height: 80,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 20,
  stageHeight: 5,
  createdAt: "2026-09-01T00:00:00",
}));

const wrapper = ({ children }: PropsWithChildren) => <MemoryRouter>{children}</MemoryRouter>;
const defaultProps = { searchKeyword: "", selectedRegions: [] as string[], minCapacity: 0, sort: "name" as const, sortDirection: "asc" as const };

describe("useVenueList", () => {
  beforeEach(() => {
    mockUseVenues.mockReturnValue({ data: venues, isPending: false, isError: false });
    useSessionStore.setState({ user: null, status: "authenticated" });
  });

  it("지역 목록과 조회 상태를 제공하고 관리자 여부를 판단한다", () => {
    useSessionStore.setState({
      user: { id: 1, email: "admin@example.com", nickname: "관리자", profileImageUrl: null, role: "ADMIN", oauthAccounts: [] },
      status: "authenticated",
    });
    const { result } = renderHook(() => useVenueList(defaultProps), { wrapper });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.allRegions).toEqual(["부산광역시", "서울특별시"]);
    expect(result.current.filteredVenues.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("데이터가 없으면 빈 목록을 사용한다", () => {
    mockUseVenues.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const { result } = renderHook(() => useVenueList(defaultProps), { wrapper });

    expect(result.current.filteredVenues).toEqual([]);
    expect(result.current.allRegions).toEqual([]);
    expect(result.current.isAdmin).toBe(false);
  });

  it("검색어, 지역과 최소 수용 인원으로 필터링한다", () => {
    const { result } = renderHook(
      () => useVenueList({ ...defaultProps, searchKeyword: " 아레나 ", selectedRegions: ["부산광역시"], minCapacity: 400 }),
      { wrapper },
    );

    expect(result.current.filteredVenues.map(({ id }) => id)).toEqual([2]);
  });

  it.each([
    ["name", "desc", [3, 2, 1]],
    ["capacity", "asc", [1, 3, 2]],
    ["capacity", "desc", [2, 3, 1]],
    ["region", "asc", [3, 2, 1]],
    ["region", "desc", [1, 2, 3]],
    ["popular", "asc", [2, 1, 3]],
    ["popular", "desc", [3, 1, 2]],
  ] as const)("%s %s 정렬을 적용한다", (sort, sortDirection, expectedIds) => {
    const { result } = renderHook(() => useVenueList({ ...defaultProps, sort, sortDirection }), { wrapper });

    expect(result.current.filteredVenues.map(({ id }) => id)).toEqual(expectedIds);
  });
});
