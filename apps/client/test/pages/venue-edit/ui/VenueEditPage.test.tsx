import { fireEvent, render, screen } from "@testing-library/react";

import VenueEditPage from "@pages/venue-edit/ui/VenueEditPage";

const mocks = vi.hoisted(() => ({ useVenueEdit: vi.fn(), cancel: vi.fn(), submit: vi.fn() }));

vi.mock("@pages/venue-edit/model/use-venue-edit", () => ({ useVenueEdit: mocks.useVenueEdit }));
vi.mock("@features/venue-form", () => ({
  VenueForm: (props: Record<string, unknown>) => (
    <div data-testid="venue-form" data-mode={props.mode as string}>
      {props.initialValues ? "초기값 있음" : "초기값 없음"}
    </div>
  ),
}));

describe("VenueEditPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("조회 중 로딩 안내를 표시한다", () => {
    mocks.useVenueEdit.mockReturnValue({
      loadState: { status: "loading" },
      submitState: { status: "idle" },
      handleSubmit: mocks.submit,
      handleCancel: mocks.cancel,
    });
    render(<VenueEditPage />);
    expect(screen.getByText("공연장 정보를 불러오고 있어요")).toBeInTheDocument();
  });

  it("조회 오류와 목록 이동 버튼을 표시한다", () => {
    mocks.useVenueEdit.mockReturnValue({
      loadState: { status: "error", error: "조회 오류" },
      submitState: { status: "idle" },
      handleSubmit: mocks.submit,
      handleCancel: mocks.cancel,
    });
    render(<VenueEditPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("조회 오류");
    fireEvent.click(screen.getByRole("button", { name: "공연장 목록으로 돌아가기" }));
    expect(mocks.cancel).toHaveBeenCalledOnce();
  });

  it("조회 성공 시 수정 폼에 초기값을 전달한다", () => {
    mocks.useVenueEdit.mockReturnValue({
      loadState: { status: "success", data: { venue: {}, venueSeats: [] } },
      submitState: { status: "submitting" },
      handleSubmit: mocks.submit,
      handleCancel: mocks.cancel,
    });
    render(<VenueEditPage />);
    expect(screen.getByTestId("venue-form")).toHaveAttribute("data-mode", "edit");
    expect(screen.getByTestId("venue-form")).toHaveTextContent("초기값 있음");
  });
});
