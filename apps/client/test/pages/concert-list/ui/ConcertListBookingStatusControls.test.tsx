import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BOOKING_STATUS_MAP } from "@entities/concert";

import ConcertListBookingStatusControls from "@pages/concertList/ui/ConcertListBookingStatusControls";

describe("ConcertListBookingStatusControls", () => {
  it("공연 종료를 제외한 모든 예매 상태를 렌더링한다", () => {
    render(<ConcertListBookingStatusControls selectedBookingStatuses={[]} onToggleBookingStatus={vi.fn()} />);

    for (const [status, { label }] of Object.entries(BOOKING_STATUS_MAP)) {
      if (status === "ended") {
        expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
        continue;
      }

      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("선택된 예매 상태를 체크 상태로 표시한다", () => {
    render(<ConcertListBookingStatusControls selectedBookingStatuses={["available"]} onToggleBookingStatus={vi.fn()} />);

    expect(screen.getByLabelText("예매 중")).toBeChecked();
    expect(screen.getByLabelText("매진")).not.toBeChecked();
  });

  it("예매 상태 변경을 onToggleBookingStatus에 위임한다", async () => {
    const user = userEvent.setup();
    const onToggleBookingStatus = vi.fn();

    render(<ConcertListBookingStatusControls selectedBookingStatuses={[]} onToggleBookingStatus={onToggleBookingStatus} />);

    await user.click(screen.getByLabelText("매진"));

    expect(onToggleBookingStatus).toHaveBeenCalledWith("soldout");
  });
});
