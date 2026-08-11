import { render } from "@testing-library/react";

import { SEAT_STYLE_MAP } from "@entities/seat";

import SeatBox from "@features/seat/ui/SeatBox";

describe("SeatBox", () => {
  it.each(["available", "held_mine", "held_other", "booked"] as const)("%s 상태에서 SEAT_STYLE_MAP의 스타일 클래스를 적용한다", (status) => {
    const { container } = render(<SeatBox status={status} />);
    const el = container.firstChild as HTMLElement;

    for (const cls of SEAT_STYLE_MAP[status].style.split(" ")) {
      expect(el.className).toContain(cls);
    }
  });
});
