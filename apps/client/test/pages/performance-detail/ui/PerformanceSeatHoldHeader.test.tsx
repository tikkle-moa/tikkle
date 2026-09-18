import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PerformanceSeatHoldHeader from "@pages/performance-detail/ui/PerformanceSeatHoldHeader";

const connectionStyle = {
  label: "실시간 연결됨",
  description: "좌석 상태가 동기화되었습니다.",
  className: "connected",
  dotClassName: "dot",
};

describe("PerformanceSeatHoldHeader", () => {
  it("연결 상태에서 새로고침을 실행한다", async () => {
    const user = userEvent.setup();
    const handleRefresh = vi.fn();
    render(<PerformanceSeatHoldHeader connectionStyle={connectionStyle} isConnected isRefreshing={false} handleRefresh={handleRefresh} />);

    expect(screen.getByRole("status")).toHaveTextContent("실시간 연결됨");
    await user.click(screen.getByRole("button", { name: "좌석 상태 새로고침" }));
    expect(handleRefresh).toHaveBeenCalledOnce();
  });

  it("연결되지 않으면 버튼을 숨기고 새로고침 중이면 비활성화한다", () => {
    const { rerender } = render(
      <PerformanceSeatHoldHeader connectionStyle={connectionStyle} isConnected={false} isRefreshing={false} handleRefresh={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<PerformanceSeatHoldHeader connectionStyle={connectionStyle} isConnected isRefreshing handleRefresh={vi.fn()} />);
    expect(screen.getByRole("button", { name: "좌석 상태 새로고침 중" })).toBeDisabled();
  });
});
