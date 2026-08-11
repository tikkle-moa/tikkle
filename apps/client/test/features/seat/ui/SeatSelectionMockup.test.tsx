import { render, screen } from "@testing-library/react";

import { MOCK_GROUP_MEMBERS } from "@features/seat/model/mock-seat.constants";
import SeatSelectionMockup from "@features/seat/ui/SeatSelectionMockup";

describe("SeatSelectionMockup", () => {
  beforeEach(() => {
    render(<SeatSelectionMockup />);
  });

  it("타이머 배지를 렌더링한다", () => {
    expect(screen.getByText(/03:42 남음/)).toBeInTheDocument();
  });

  it("STAGE 레이블을 렌더링한다", () => {
    expect(screen.getByText("STAGE")).toBeInTheDocument();
  });

  it("그룹 멤버 아바타를 렌더링한다", () => {
    for (const { initial } of MOCK_GROUP_MEMBERS) {
      expect(screen.getByText(initial)).toBeInTheDocument();
    }
  });

  it("접속 중 멤버 수를 표시한다", () => {
    expect(screen.getByText(`${MOCK_GROUP_MEMBERS.length}명 함께 보는 중`)).toBeInTheDocument();
  });

  it("모든 좌석 상태 범례를 렌더링한다", () => {
    expect(screen.getByText("선택 가능")).toBeInTheDocument();
    expect(screen.getByText("우리 그룹")).toBeInTheDocument();
    expect(screen.getByText("다른 그룹")).toBeInTheDocument();
    expect(screen.getByText("예약 완료")).toBeInTheDocument();
  });
});
