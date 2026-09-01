import { fireEvent, render, screen } from "@testing-library/react";

import type { CreateVenueDetailRequest } from "@entities/venue";

import VenueForm from "@features/venue-form/ui/VenueForm";

vi.mock("@features/venue-form/ui/VenueSeatForm", () => ({ default: () => <div>좌석 폼</div> }));

const initialValues: CreateVenueDetailRequest = {
  venue: {
    name: "공연장",
    address: "서울시",
    description: "설명",
    width: 100,
    height: 80,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 40,
    stageHeight: 10,
  },
  venueSeats: [{ sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 }],
};

describe("VenueForm", () => {
  it("생성 폼 값을 수정하고 제출하며 취소한다", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<VenueForm mode="create" initialValues={initialValues} submitState={{ status: "idle" }} onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText(/공연장 이름/), { target: { value: "새 공연장" } });
    fireEvent.change(screen.getByLabelText(/주소/), { target: { value: "새 주소" } });
    fireEvent.change(screen.getByLabelText(/공연장 설명/), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/공연장 설명/), { target: { value: "새 설명" } });
    fireEvent.change(screen.getByLabelText(/공연장 가로/), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText(/공연장 세로/), { target: { value: "90" } });
    fireEvent.change(screen.getByLabelText(/무대 X 좌표/), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText(/무대 Y 좌표/), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText(/무대 가로/), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText(/무대 세로/), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "공연장 등록" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ venue: expect.objectContaining({ name: "새 공연장", description: "새 설명", width: 120 }) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("수정, 제출 중, 서버 오류 상태를 표시한다", () => {
    render(<VenueForm mode="edit" submitState={{ status: "error", error: "등록 오류" }} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "공연장 수정" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("등록 오류");
    expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument();

    const { unmount } = render(<VenueForm mode="create" submitState={{ status: "submitting" }} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "등록 중..." })).toBeDisabled();
    unmount();
  });
});
