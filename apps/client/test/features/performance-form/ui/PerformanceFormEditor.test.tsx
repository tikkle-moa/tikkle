import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PerformanceFormEditor from "@features/performance-form/ui/PerformanceFormEditor";

const initialValues = {
  startsAt: "2099-09-01T19:00",
  bookingOpensAt: "2099-08-30T19:00",
};

const renderPerformanceFormEditor = (overrides = {}) => {
  const props = {
    initialValues,
    submitLabel: "회차 등록",
    submitState: { status: "idle" } as const,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  render(<PerformanceFormEditor {...props} />);

  return props;
};

describe("renderPerformanceFormEditor", () => {
  it("입력 초기값을 표시하고 제출한다", async () => {
    const { onSubmit } = renderPerformanceFormEditor();

    expect(screen.getByLabelText(/공연 시작 시각/)).toHaveValue(initialValues.startsAt);
    expect(screen.getByLabelText(/예매 시작 시각/)).toHaveValue(initialValues.bookingOpensAt);

    fireEvent.click(screen.getByRole("button", { name: "회차 등록" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(initialValues);
    });
  });

  it("시간 범위가 유효하지 않으면 오류를 표시한다", () => {
    const { onSubmit } = renderPerformanceFormEditor({
      initialValues: {
        startsAt: initialValues.startsAt,
        bookingOpensAt: "2099-09-02T19:00",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "회차 등록" }));

    expect(screen.getByText("예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("제출 중에는 입력과 버튼을 비활성화한다", () => {
    renderPerformanceFormEditor({
      submitState: { status: "submitting" },
    });

    expect(screen.getByLabelText(/공연 시작 시각/)).toBeDisabled();
    expect(screen.getByLabelText(/예매 시작 시각/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "저장 중..." })).toBeDisabled();
  });

  it("제출 오류를 표시한다", () => {
    renderPerformanceFormEditor({
      submitState: { status: "error", error: "회차 등록에 실패했습니다." },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("회차 등록에 실패했습니다.");
  });

  it("입력값을 변경한다", () => {
    renderPerformanceFormEditor({
      initialValues: {
        startsAt: "",
        bookingOpensAt: "",
      },
    });

    fireEvent.change(screen.getByLabelText(/공연 시작 시각/), {
      target: { value: "2099-09-01T19:00" },
    });
    fireEvent.change(screen.getByLabelText(/예매 시작 시각/), {
      target: { value: "2099-08-30T19:00" },
    });

    expect(screen.getByLabelText(/공연 시작 시각/)).toHaveValue("2099-09-01T19:00");
    expect(screen.getByLabelText(/예매 시작 시각/)).toHaveValue("2099-08-30T19:00");
  });

  it("공연 시작 시각이 없으면 오류를 표시한다", () => {
    const { onSubmit } = renderPerformanceFormEditor({
      initialValues: {
        startsAt: "",
        bookingOpensAt: "",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "회차 등록" }));

    expect(screen.getByText("공연 시작 시각을 입력해 주세요.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("취소 버튼을 누르면 onCancel을 호출한다", () => {
    const onCancel = vi.fn();

    renderPerformanceFormEditor({ onCancel });

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
