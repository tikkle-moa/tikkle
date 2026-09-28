import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PerformanceCheckoutNavigationDialog from "@pages/performance-checkout/ui/PerformanceCheckoutNavigationDialog";

describe("PerformanceCheckoutNavigationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("예매 정보 확인 종료 안내와 선택을 표시한다", async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();
    const onStay = vi.fn();

    render(
      <PerformanceCheckoutNavigationDialog
        errorMessage="예매 정보 확인 종료에 실패했습니다."
        isEnding={false}
        onProceed={onProceed}
        onStay={onStay}
      />,
    );

    expect(screen.getByRole("dialog", { name: "예매 정보 확인을 종료할까요?" })).toHaveTextContent(
      "좌석 점유는 만료 시간까지 유지되며, 남은 시간은 계속 줄어듭니다.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("예매 정보 확인 종료에 실패했습니다.");
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "계속 확인하기" }));
    expect(onStay).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "나가기" }));
    expect(onProceed).toHaveBeenCalledOnce();
  });

  it("리뷰 종료 중에는 선택 버튼을 비활성화하고 진행 상태를 표시한다", () => {
    render(<PerformanceCheckoutNavigationDialog errorMessage={null} isEnding onProceed={vi.fn()} onStay={vi.fn()} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계속 확인하기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "좌석 상태 확인 중..." })).toBeDisabled();
  });

  it("dialog 취소 이벤트는 기본 닫힘을 막고 확인 화면에 남는다", () => {
    const onStay = vi.fn();
    const dialog = render(<PerformanceCheckoutNavigationDialog errorMessage={null} isEnding={false} onProceed={vi.fn()} onStay={onStay} />).getByRole(
      "dialog",
    );
    const event = new Event("cancel", { bubbles: false, cancelable: true });

    fireEvent(dialog, event);

    expect(event.defaultPrevented).toBe(true);
    expect(onStay).toHaveBeenCalledOnce();
  });

  it("컴포넌트가 사라지면 열린 dialog를 닫는다", () => {
    const { unmount } = render(<PerformanceCheckoutNavigationDialog errorMessage={null} isEnding={false} onProceed={vi.fn()} onStay={vi.fn()} />);

    unmount();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();
  });

  it("이미 열린 dialog는 다시 열지 않고 닫히지 않은 상태에서는 닫지 않는다", () => {
    const open = vi.spyOn(HTMLDialogElement.prototype, "open", "get").mockReturnValue(true);
    const { unmount } = render(<PerformanceCheckoutNavigationDialog errorMessage={null} isEnding={false} onProceed={vi.fn()} onStay={vi.fn()} />);

    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();

    open.mockReturnValue(false);
    unmount();

    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
