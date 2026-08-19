import { render, screen } from "@testing-library/react";

import ConcertNewPage from "@pages/concertNew/ui/ConcertNewPage";

const { mockHandleCancel, mockHandleSubmit, mockUseConcertNew } = vi.hoisted(() => ({
  mockHandleCancel: vi.fn(),
  mockHandleSubmit: vi.fn(),
  mockUseConcertNew: vi.fn(),
}));

vi.mock("@pages/concertNew/model/use-concert-new", () => ({ useConcertNew: mockUseConcertNew }));
vi.mock("@features/concert-form", () => ({
  ConcertForm: (props: { mode: string; isSubmitting: boolean; submitError: string | null }) => (
    <div data-testid="concert-form" data-mode={props.mode} data-submitting={String(props.isSubmitting)}>
      {props.submitError}
    </div>
  ),
}));

describe("ConcertNewPage", () => {
  it("등록 안내와 생성 폼 상태를 렌더링한다", () => {
    mockUseConcertNew.mockReturnValue({
      isSubmitting: true,
      submitError: "등록 오류",
      handleSubmit: mockHandleSubmit,
      handleCancel: mockHandleCancel,
    });

    render(<ConcertNewPage />);

    expect(screen.getByRole("heading", { name: "콘서트 등록" })).toBeInTheDocument();
    expect(screen.getByText(/기본 정보와 포스터/)).toBeInTheDocument();
    expect(screen.getByTestId("concert-form")).toHaveAttribute("data-mode", "create");
    expect(screen.getByTestId("concert-form")).toHaveAttribute("data-submitting", "true");
    expect(screen.getByText("등록 오류")).toBeInTheDocument();
  });
});
