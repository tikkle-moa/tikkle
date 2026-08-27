import { fireEvent, render, screen } from "@testing-library/react";

import { PerformanceForm } from "@features/performance-form";

const { mockUsePerformanceForm } = vi.hoisted(() => ({
  mockUsePerformanceForm: vi.fn(),
}));

vi.mock("@features/performance-form/model/use-performance-form", () => ({
  usePerformanceForm: mockUsePerformanceForm,
}));

const onSaved = vi.fn().mockResolvedValue(undefined);
const onSuccess = vi.fn();
const onCancel = vi.fn();

describe("PerformanceForm", () => {
  const defaultFormState = {
    values: {
      name: "1회차",
      startsAt: "2099-09-01T19:00",
      bookingOpensAt: "2099-08-30T19:00",
    },
    errors: {},
    submitState: { status: "idle" as const },
    isSubmitting: false,
    updateField: vi.fn(),
    handleSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePerformanceForm.mockReturnValue(defaultFormState);
  });

  it("입력 오류와 저장 오류를 표시한다", () => {
    mockUsePerformanceForm.mockReturnValue({
      ...defaultFormState,
      errors: {
        name: "공연 회차명을 입력해 주세요.",
        startsAt: "공연 시작 시각을 입력해 주세요.",
        bookingOpensAt: "예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.",
      },
      submitState: {
        status: "error",
        error: "공연 회차 저장 중 오류가 발생했습니다.",
      },
    });

    render(<PerformanceForm concertId={7} onCancel={onCancel} onSaved={onSaved} onSuccess={onSuccess} submitLabel="등록" />);

    expect(screen.getByText("공연 회차명을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("공연 시작 시각을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("공연 회차 저장 중 오류가 발생했습니다.");
  });

  it("저장 중에는 입력과 버튼을 비활성화한다", () => {
    mockUsePerformanceForm.mockReturnValue({
      ...defaultFormState,
      submitState: { status: "submitting" as const },
      isSubmitting: true,
    });

    render(<PerformanceForm concertId={7} onCancel={onCancel} onSaved={onSaved} onSuccess={onSuccess} submitLabel="등록" />);

    expect(screen.getByLabelText(/공연 회차명/)).toBeDisabled();
    expect(screen.getByLabelText(/공연 시작 시각/)).toBeDisabled();
    expect(screen.getByLabelText(/예매 시작 시각/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "저장 중..." })).toBeDisabled();
  });

  it("회차명과 생성 버튼을 표시한다", () => {
    render(<PerformanceForm concertId={7} onCancel={onCancel} onSaved={onSaved} onSuccess={onSuccess} submitLabel="등록" />);

    expect(screen.getByLabelText(/공연 회차명/)).toHaveValue("1회차");
    expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
  });

  it("취소를 누르면 취소 콜백을 호출한다", () => {
    render(<PerformanceForm concertId={7} onCancel={onCancel} onSaved={onSaved} onSuccess={onSuccess} submitLabel="등록" />);

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("세 입력 변경을 폼 훅에 전달한다", () => {
    const updateField = vi.fn();

    mockUsePerformanceForm.mockReturnValue({
      ...defaultFormState,
      updateField,
    });

    render(<PerformanceForm concertId={7} onCancel={onCancel} onSaved={onSaved} onSuccess={onSuccess} submitLabel="등록" />);

    fireEvent.change(screen.getByLabelText(/공연 회차명/), {
      target: { value: "2회차" },
    });
    fireEvent.change(screen.getByLabelText(/공연 시작 시각/), {
      target: { value: "2099-09-02T19:00" },
    });
    fireEvent.change(screen.getByLabelText(/예매 시작 시각/), {
      target: { value: "2099-08-31T19:00" },
    });

    expect(updateField).toHaveBeenNthCalledWith(1, "name", "2회차");
    expect(updateField).toHaveBeenNthCalledWith(2, "startsAt", "2099-09-02T19:00");
    expect(updateField).toHaveBeenNthCalledWith(3, "bookingOpensAt", "2099-08-31T19:00");
  });
});
