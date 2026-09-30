import { fireEvent, render, screen } from "@testing-library/react";

import { MobileVenueFilter, MobileVenueFilterPanel, VenueFilterPanel } from "@features/venue-filter";

const props = {
  allRegions: ["부산광역시", "서울특별시"],
  searchValue: "아레나",
  selectedRegions: ["서울특별시"],
  minCapacity: 100,
  activeFilterCount: 3,
  onSearchInputChange: vi.fn(),
  onToggleRegion: vi.fn(),
  onChangeMinCapacity: vi.fn(),
  onClearFilters: vi.fn(),
};

describe("venue filter UI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("데스크톱 필터 입력과 선택 동작을 전달한다", () => {
    render(<VenueFilterPanel {...props} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "이름 또는 주소 검색" }), { target: { value: "홀" } });
    fireEvent.click(screen.getByRole("button", { name: "부산광역시" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "최소 수용 인원" }), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));

    expect(props.onSearchInputChange).toHaveBeenCalled();
    expect(props.onToggleRegion).toHaveBeenCalledWith("부산광역시");
    expect(props.onChangeMinCapacity).toHaveBeenCalledWith(500);
    expect(props.onClearFilters).toHaveBeenCalledOnce();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "서울특별시" })).toHaveAttribute("aria-pressed", "true");
  });

  it("지역이 없고 필터가 비활성화된 상태를 표시한다", () => {
    render(<VenueFilterPanel {...props} allRegions={[]} activeFilterCount={0} />);

    expect(screen.getByText("선택 가능한 지역이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초기화" })).toBeDisabled();
  });

  it("모바일 필터 버튼의 열림 상태와 필터 수를 표시한다", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<MobileVenueFilter isOpen={false} activeFilterCount={0} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "필터" }));
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<MobileVenueFilter isOpen activeFilterCount={2} onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "필터 2개 선택됨" })).toHaveAttribute("aria-expanded", "true");
  });

  it("모바일 필터 패널에서 초기화를 제공한다", () => {
    const { rerender } = render(<MobileVenueFilterPanel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(props.onClearFilters).toHaveBeenCalledOnce();

    rerender(<MobileVenueFilterPanel {...props} activeFilterCount={0} />);
    expect(screen.queryByRole("button", { name: "초기화" })).not.toBeInTheDocument();
  });
});
