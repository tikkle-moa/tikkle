import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConfirmationDialog from "@shared/ui/ConfirmationDialog";

describe("ConfirmationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("공통 확인창의 제목과 설명을 표시하고 선택을 전달한다", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmationDialog
        title="예매를 취소할까요?"
        message="취소 요청 결과를 이 화면에서 확인할 수 있어요."
        cancelLabel="취소하지 않기"
        confirmLabel="예매 취소"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("dialog", { name: "예매를 취소할까요?" })).toHaveTextContent("취소 요청 결과를 이 화면에서 확인할 수 있어요.");
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "취소하지 않기" }));
    await user.click(screen.getByRole("button", { name: "예매 취소" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("오류를 표시하고 처리 중에는 두 선택을 비활성화한다", () => {
    render(
      <ConfirmationDialog
        title="예매 정보를 종료할까요?"
        message="종료하면 확인 잠금이 해제됩니다."
        cancelLabel="계속 확인하기"
        confirmLabel="나가기"
        processingLabel="상태 확인 중..."
        errorMessage="종료 요청에 실패했습니다."
        isProcessing
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("종료 요청에 실패했습니다.");
    expect(screen.getByRole("button", { name: "계속 확인하기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "상태 확인 중..." })).toBeDisabled();
  });

  it("처리 중 문구가 없으면 기본 확인 문구를 유지한다", () => {
    render(
      <ConfirmationDialog
        title="예매 취소"
        message="취소 요청을 진행할까요?"
        cancelLabel="돌아가기"
        confirmLabel="취소 요청"
        isProcessing
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "취소 요청" })).toBeDisabled();
  });

  it("dialog 취소 이벤트는 기본 닫힘을 막고 취소 핸들러를 호출한다", () => {
    const onCancel = vi.fn();
    const { unmount } = render(
      <ConfirmationDialog title="확인" message="안내" cancelLabel="머무르기" confirmLabel="진행하기" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    const dialog = screen.getByRole("dialog");
    const event = new Event("cancel", { bubbles: false, cancelable: true });

    fireEvent(dialog, event);

    expect(event.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledOnce();

    unmount();

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();
  });
});
