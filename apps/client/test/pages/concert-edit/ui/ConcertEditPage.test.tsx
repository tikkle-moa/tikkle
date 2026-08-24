import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConcertEditPage from "@pages/concert-edit/ui/ConcertEditPage";

const { mockUseConcertEdit } = vi.hoisted(() => ({ mockUseConcertEdit: vi.fn() }));

vi.mock("@pages/concert-edit/model/use-concert-edit", () => ({ useConcertEdit: mockUseConcertEdit }));
vi.mock("@features/concert-form", () => ({
  ConcertForm: (props: { initialValues?: { title: string }; submitLabel: string }) => (
    <div data-testid="concert-form" data-submit-label={props.submitLabel}>
      {props.initialValues?.title}
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

const baseState = {
  loadState: { status: "loading" as const },
  submitState: { status: "idle" as const },
  handleSubmit: vi.fn(),
  handleCancel: vi.fn(),
};

describe("ConcertEditPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("조회 중에는 로딩 상태를 표시하고 폼을 숨긴다", () => {
    mockUseConcertEdit.mockReturnValue(baseState);
    render(<ConcertEditPage />);

    expect(screen.getByText("콘서트 정보를 불러오고 있어요")).toBeInTheDocument();
    expect(screen.getByText("수정할 정보를 준비하는 동안 잠시만 기다려 주세요.")).toBeInTheDocument();
    expect(screen.queryByTestId("concert-form")).not.toBeInTheDocument();
  });

  it("조회가 완료되면 초기값과 수정 상태를 폼에 전달한다", () => {
    mockUseConcertEdit.mockReturnValue({
      ...baseState,
      loadState: {
        status: "success",
        data: { title: "기존 공연", genre: "INDIE", placeName: "공연장", posterUrl: null, description: null },
      },
    });
    render(<ConcertEditPage />);

    expect(screen.getByRole("heading", { name: "콘서트 수정" })).toBeInTheDocument();
    expect(screen.getByTestId("concert-form")).toHaveAttribute("data-submit-label", "변경사항 저장");
    expect(screen.getByText("기존 공연")).toBeInTheDocument();
  });

  it("조회 오류를 안내하고 목록으로 돌아갈 수 있다", async () => {
    mockUseConcertEdit.mockReturnValue({ ...baseState, loadState: { status: "error", error: "조회 오류" } });
    render(<ConcertEditPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("조회 오류");
    await userEvent.click(screen.getByRole("button", { name: "콘서트 목록으로 돌아가기" }));
    expect(baseState.handleCancel).toHaveBeenCalledOnce();
  });
});
