import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MobileConcertListFilterPanel from "@pages/concertList/ui/MobileConcertListFilterPanel";

const renderMobileFilterPanel = (activeFilterCount = 0, onClearFilters = vi.fn()) => {
  render(
    <MobileConcertListFilterPanel
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

describe("MobileConcertListFilterPanel", () => {
  it("장르, 상태, 공연일 필터 섹션을 렌더링한다", () => {
    renderMobileFilterPanel();

    expect(screen.getByRole("heading", { name: "장르" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "상태" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공연일" })).toBeInTheDocument();
  });

  it("선택된 필터가 없으면 초기화 버튼을 렌더링하지 않는다", () => {
    renderMobileFilterPanel();

    expect(screen.queryByRole("button", { name: "초기화" })).not.toBeInTheDocument();
  });

  it("선택된 필터가 있으면 초기화 버튼을 렌더링하고 클릭을 위임한다", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();

    renderMobileFilterPanel(1, onClearFilters);

    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
