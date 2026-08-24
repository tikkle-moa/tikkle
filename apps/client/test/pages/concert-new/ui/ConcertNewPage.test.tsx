import { render, screen } from "@testing-library/react";

import ConcertNewPage from "@pages/concert-new/ui/ConcertNewPage";

const { mockHandleCancel, mockHandleSubmit, mockUseConcertNew } = vi.hoisted(() => ({
  mockHandleCancel: vi.fn(),
  mockHandleSubmit: vi.fn(),
  mockUseConcertNew: vi.fn(),
}));

vi.mock("@pages/concert-new/model/use-concert-new", () => ({ useConcertNew: mockUseConcertNew }));
vi.mock("@features/concert-form", () => ({
  ConcertForm: (props: { submitLabel: string; submitState: { status: string; error?: string } }) => (
    <div data-testid="concert-form" data-submit-label={props.submitLabel} data-submit-status={props.submitState.status}>
      {props.submitState.error}
    </div>
  ),
}));
vi.mock("@features/concert-manage", () => ({
  ConcertManageIntro: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

describe("ConcertNewPage", () => {
  it("등록 안내와 생성 폼 상태를 렌더링한다", () => {
    mockUseConcertNew.mockReturnValue({
      submitState: { status: "error", error: "등록 오류" },
      handleSubmit: mockHandleSubmit,
      handleCancel: mockHandleCancel,
    });

    render(<ConcertNewPage />);

    expect(screen.getByRole("heading", { name: "콘서트 등록" })).toBeInTheDocument();
    expect(screen.getByText(/기본 정보와 포스터/)).toBeInTheDocument();
    expect(screen.getByTestId("concert-form")).toHaveAttribute("data-submit-label", "콘서트 등록");
    expect(screen.getByTestId("concert-form")).toHaveAttribute("data-submit-status", "error");
    expect(screen.getByText("등록 오류")).toBeInTheDocument();
  });
});
