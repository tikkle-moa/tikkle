import { act, render, renderHook } from "@testing-library/react";

import { useOAuthErrorModal } from "@pages/login/model/use-oauth-error-modal";

describe("useOAuthErrorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dialog가 마운트되면 showModal을 호출한다", () => {
    const Fixture = () => {
      const { dialogRef } = useOAuthErrorModal(vi.fn());

      return <dialog ref={dialogRef} />;
    };

    render(<Fixture />);

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
  });

  it("dialog가 없으면 showModal을 호출하지 않는다", () => {
    renderHook(() => useOAuthErrorModal(vi.fn()));

    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it("이미 열린 dialog면 showModal을 다시 호출하지 않는다", () => {
    const Fixture = () => {
      const { dialogRef } = useOAuthErrorModal(vi.fn());

      return <dialog ref={dialogRef} open />;
    };

    render(<Fixture />);

    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it("handleCancel은 기본 동작을 막고 onClose를 호출한다", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useOAuthErrorModal(onClose));

    const fakeEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLDialogElement>;

    act(() => {
      result.current.handleCancel(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
