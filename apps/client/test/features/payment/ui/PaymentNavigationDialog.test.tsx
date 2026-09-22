import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaymentNavigationDialog from "@features/payment/ui/PaymentNavigationDialog";

describe("PaymentNavigationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("결제 중단 안내를 표시하고 사용자의 선택을 전달한다", async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();
    const onStay = vi.fn();

    render(<PaymentNavigationDialog message="좌석 점유는 만료 시간까지 유지됩니다." onProceed={onProceed} onStay={onStay} />);

    expect(screen.getByRole("dialog", { name: "결제 준비를 중단할까요?" })).toHaveTextContent("좌석 점유는 만료 시간까지 유지됩니다.");
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "결제 계속하기" }));
    expect(onStay).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "이전 화면으로 이동" }));
    expect(onProceed).toHaveBeenCalledOnce();
  });

  it("dialog 취소 이벤트는 기본 닫힘을 막고 결제 화면에 남는다", () => {
    const onStay = vi.fn();
    const dialog = render(<PaymentNavigationDialog message="좌석 점유는 만료 시간까지 유지됩니다." onProceed={vi.fn()} onStay={onStay} />).getByRole(
      "dialog",
    );
    const event = new Event("cancel", { bubbles: false, cancelable: true });

    fireEvent(dialog, event);

    expect(event.defaultPrevented).toBe(true);
    expect(onStay).toHaveBeenCalledOnce();
  });

  it("컴포넌트가 사라지면 열린 dialog를 닫는다", () => {
    const { unmount } = render(<PaymentNavigationDialog message="안내" onProceed={vi.fn()} onStay={vi.fn()} />);

    unmount();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it("이미 열린 dialog는 다시 열지 않고 닫힌 상태로 unmount하면 닫지 않는다", () => {
    const open = vi.spyOn(HTMLDialogElement.prototype, "open", "get").mockReturnValue(true);
    const { unmount } = render(<PaymentNavigationDialog message="안내" onProceed={vi.fn()} onStay={vi.fn()} />);

    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();

    open.mockReturnValue(false);
    unmount();

    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
