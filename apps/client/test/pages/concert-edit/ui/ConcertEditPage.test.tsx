import { render, screen } from "@testing-library/react";

import ConcertEditPage from "@pages/concert-edit/ui/ConcertEditPage";

const { mockUseConcertEdit } = vi.hoisted(() => ({ mockUseConcertEdit: vi.fn() }));

vi.mock("@pages/concert-edit/model/use-concert-edit", () => ({ useConcertEdit: mockUseConcertEdit }));
vi.mock("@features/concert-form", () => ({
  ConcertForm: (props: { mode: string; initialValues?: { title: string }; isSubmitting: boolean; submitError: string | null }) => (
    <div data-testid="concert-form" data-mode={props.mode} data-submitting={String(props.isSubmitting)}>
      {props.initialValues?.title} {props.submitError}
    </div>
  ),
}));

const baseState = { isSubmitting: false, submitError: null, handleSubmit: vi.fn(), handleCancel: vi.fn() };

describe("ConcertEditPage", () => {
  it("유효하지 않은 ID 안내를 표시한다", () => {
    mockUseConcertEdit.mockReturnValue({ ...baseState, isParamValid: false, initialValues: null });
    render(<ConcertEditPage />);
    expect(screen.getByRole("heading", { name: "잘못된 콘서트" })).toBeInTheDocument();
    expect(screen.getByText("올바르지 않은 콘서트 ID입니다.")).toBeInTheDocument();
    expect(screen.queryByTestId("concert-form")).not.toBeInTheDocument();
  });

  it("조회된 초기값과 수정 상태를 폼에 전달한다", () => {
    mockUseConcertEdit.mockReturnValue({
      ...baseState,
      isParamValid: true,
      initialValues: { title: "기존 공연" },
      isSubmitting: true,
      submitError: "수정 오류",
    });
    render(<ConcertEditPage />);
    expect(screen.getByRole("heading", { name: "콘서트 수정" })).toBeInTheDocument();
    expect(screen.getByTestId("concert-form")).toHaveAttribute("data-mode", "edit");
    expect(screen.getByTestId("concert-form")).toHaveAttribute("data-submitting", "true");
    expect(screen.getByText(/기존 공연 수정 오류/)).toBeInTheDocument();
  });

  it("조회 전에는 초기값 없이 수정 폼을 렌더링한다", () => {
    mockUseConcertEdit.mockReturnValue({ ...baseState, isParamValid: true, initialValues: null });
    render(<ConcertEditPage />);
    expect(screen.getByTestId("concert-form")).toBeInTheDocument();
  });
});
