import { fireEvent, render, screen } from "@testing-library/react";

import ConcertDateRangeFilterControls from "@features/concert-filter/ui/ConcertDateRangeFilterControls";

describe("ConcertDateRangeFilterControls", () => {
  it("전달받은 시작일과 종료일을 렌더링한다", () => {
    render(<ConcertDateRangeFilterControls startDate="2026-08-20" endDate="2026-08-31" onStartDateChange={vi.fn()} onEndDateChange={vi.fn()} />);

    expect(screen.getByLabelText("시작일")).toHaveValue("2026-08-20");
    expect(screen.getByLabelText("종료일")).toHaveValue("2026-08-31");
  });

  it("시작일 변경을 onStartDateChange에 위임한다", () => {
    const onStartDateChange = vi.fn();

    render(<ConcertDateRangeFilterControls startDate="" endDate="" onStartDateChange={onStartDateChange} onEndDateChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("시작일"), {
      target: { value: "2026-08-20" },
    });

    expect(onStartDateChange).toHaveBeenCalledWith("2026-08-20");
  });

  it("종료일 변경을 onEndDateChange에 위임한다", () => {
    const onEndDateChange = vi.fn();

    render(<ConcertDateRangeFilterControls startDate="" endDate="" onStartDateChange={vi.fn()} onEndDateChange={onEndDateChange} />);

    fireEvent.change(screen.getByLabelText("종료일"), {
      target: { value: "2026-08-31" },
    });

    expect(onEndDateChange).toHaveBeenCalledWith("2026-08-31");
  });
});
