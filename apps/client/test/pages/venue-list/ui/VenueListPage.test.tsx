import { MemoryRouter } from "react-router";

import { fireEvent, render, screen } from "@testing-library/react";

import VenueListPage from "@pages/venue-list/ui/VenueListPage";

const mockUseVenueList = vi.hoisted(() => vi.fn());
const mockUseVenueListFilter = vi.hoisted(() => vi.fn());
vi.mock("@pages/venue-list/model/use-venue-list", () => ({ useVenueList: mockUseVenueList }));
vi.mock("@pages/venue-list/model/use-venue-list-filter", () => ({ useVenueListFilter: mockUseVenueListFilter }));

const venue = {
  id: 1,
  name: "티클 아레나",
  address: "서울특별시 송파구",
  description: null,
  width: 100,
  height: 80,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 20,
  stageHeight: 5,
  venueSeatCount: 1000,
  concertCount: 3,
  createdAt: "2026-09-01T00:00:00",
};

const filterState = {
  isMobileFilterOpen: false,
  toggleMobileFilter: vi.fn(),
  searchValue: "",
  searchKeyword: "",
  selectedRegions: [],
  minCapacity: 0,
  sort: "name",
  sortDirection: "desc",
  activeFilterCount: 0,
  handleSearchInputChange: vi.fn(),
  toggleRegion: vi.fn(),
  changeMinCapacity: vi.fn(),
  changeSort: vi.fn(),
  changeSortDirection: vi.fn(),
  clearFilters: vi.fn(),
};

const listState = { isAdmin: false, filteredVenues: [venue], allRegions: ["서울특별시"], isPending: false, isError: false };
const renderPage = () => render(<VenueListPage />, { wrapper: MemoryRouter });

describe("VenueListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVenueListFilter.mockReturnValue(filterState);
    mockUseVenueList.mockReturnValue(listState);
  });

  it("공연장 목록과 결과 수 및 관리자 등록 링크를 표시한다", () => {
    mockUseVenueList.mockReturnValue({ ...listState, isAdmin: true });
    renderPage();

    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "총 1개의 공연장")).toBeInTheDocument();
    expect(screen.getByTestId("venue-list-grid")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "공연장 등록" })).toHaveAttribute("href", "/venues/new");
  });

  it("정렬 기준과 방향 변경을 전달한다", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("정렬 기준"), { target: { value: "capacity" } });
    fireEvent.click(screen.getByRole("button", { name: "오름차순으로 변경" }));

    expect(filterState.changeSort).toHaveBeenCalledWith("capacity");
    expect(filterState.changeSortDirection).toHaveBeenCalledWith("asc");
  });

  it("오름차순에서는 내림차순 변경 버튼을 제공한다", () => {
    mockUseVenueListFilter.mockReturnValue({ ...filterState, sortDirection: "asc" });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "내림차순으로 변경" }));
    expect(filterState.changeSortDirection).toHaveBeenCalledWith("desc");
  });

  it("모바일 필터가 열리면 패널을 표시한다", () => {
    mockUseVenueListFilter.mockReturnValue({ ...filterState, isMobileFilterOpen: true });
    renderPage();
    expect(document.querySelector("#mobile-venue-filter-panel")).toBeInTheDocument();
  });

  it("로딩, 오류와 빈 목록 상태를 구분해 표시한다", () => {
    mockUseVenueList.mockReturnValue({ ...listState, filteredVenues: [], isPending: true });
    const { unmount } = renderPage();
    expect(screen.getByLabelText("공연장 목록을 불러오는 중")).toBeInTheDocument();
    unmount();

    mockUseVenueList.mockReturnValue({ ...listState, filteredVenues: [], isError: true });
    const errorView = renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("공연장 정보를 불러오지 못했습니다.");
    expect(screen.queryByText("등록된 공연장이 없습니다.")).not.toBeInTheDocument();
    errorView.unmount();

    mockUseVenueList.mockReturnValue({ ...listState, filteredVenues: [] });
    renderPage();
    expect(screen.getByText("등록된 공연장이 없습니다.")).toBeInTheDocument();
  });
});
