import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaymentNavigationDialog from "@features/payment/ui/PaymentNavigationDialog";

describe("PaymentNavigationDialog", () => {
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
});
