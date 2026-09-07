import { render, screen } from "@testing-library/react";

import VenueNewPage from "@pages/venue-new/ui/VenueNewPage";

const mocks = vi.hoisted(() => ({ useVenueNew: vi.fn(), submit: vi.fn(), cancel: vi.fn() }));
vi.mock("@pages/venue-new/model/use-venue-new", () => ({ useVenueNew: mocks.useVenueNew }));
vi.mock("@features/venue-form", () => ({
  VenueForm: ({ mode, submitState }: { mode: string; submitState: { status: string } }) => (
    <div data-testid="venue-form" data-mode={mode} data-status={submitState.status} />
  ),
}));

describe("VenueNewPage", () => {
  it("등록 안내와 공연장 생성 폼을 표시한다", () => {
    mocks.useVenueNew.mockReturnValue({ submitState: { status: "idle" }, handleSubmit: mocks.submit, handleCancel: mocks.cancel });
    render(<VenueNewPage />);
    expect(screen.getByRole("heading", { name: "공연장 등록" })).toBeInTheDocument();
    expect(screen.getByText(/공연장 구조와/)).toBeInTheDocument();
    expect(screen.getByTestId("venue-form")).toHaveAttribute("data-mode", "create");
  });
});
