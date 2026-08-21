import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MobileConcertFilterButton from "@features/concert-filter/ui/MobileConcertFilterButton";

describe("MobileConcertFilterButton", () => {
  it("필터가 없고 닫힌 상태면 기본 접근성 상태를 렌더링한다", () => {
    render(<MobileConcertFilterButton isOpen={false} activeFilterCount={0} onClick={vi.fn()} />);

    const filterButton = screen.getByRole("button", { name: "필터" });

    expect(filterButton).toHaveAttribute("aria-controls", "mobile-concert-filter-panel");
    expect(filterButton).toHaveAttribute("aria-expanded", "false");
  });

  it("열린 상태를 접근성 속성으로 렌더링한다", () => {
    render(<MobileConcertFilterButton isOpen activeFilterCount={0} onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "필터" })).toHaveAttribute("aria-expanded", "true");
  });

  it("선택된 필터 수를 숫자 배지와 접근성 이름으로 렌더링한다", () => {
    render(<MobileConcertFilterButton isOpen={false} activeFilterCount={2} onClick={vi.fn()} />);

    const filterButton = screen.getByRole("button", { name: "필터 2개 선택됨" });

    expect(filterButton).toHaveTextContent("2");
  });

  it("클릭을 onClick에 위임한다", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<MobileConcertFilterButton isOpen={false} activeFilterCount={0} onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "필터" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
