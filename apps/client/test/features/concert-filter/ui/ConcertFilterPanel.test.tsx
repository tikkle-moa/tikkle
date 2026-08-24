import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConcertFilterPanel from "@features/concert-filter/ui/ConcertFilterPanel";

const renderConcertFilterPanel = (activeFilterCount = 0, onClearFilters = vi.fn()) => {
  render(
    <ConcertFilterPanel
      selectedGenres={[]}
      selectedBookingStatuses={[]}
      startDate=""
      endDate=""
      activeFilterCount={activeFilterCount}
      onToggleGenre={vi.fn()}
      onToggleBookingStatus={vi.fn()}
      onStartDateChange={vi.fn()}
      onEndDateChange={vi.fn()}
      onClearFilters={onClearFilters}
    />,
  );
};

describe("ConcertFilterPanel", () => {
  it("장르, 예매 상태, 공연일 필터 섹션을 렌더링한다", () => {
    renderConcertFilterPanel();

    expect(screen.getByRole("heading", { name: "필터" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "장르" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "예매 상태" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공연일" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초기화" })).toBeInTheDocument();
  });

  it("선택된 필터 수가 있으면 숫자 배지를 렌더링한다", () => {
    renderConcertFilterPanel(2);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("초기화 클릭을 onClearFilters에 위임한다", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();

    renderConcertFilterPanel(1, onClearFilters);

    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
