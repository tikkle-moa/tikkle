import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import type { VenueFormErrors } from "@features/venue-form/model/venue-form.types";
import VenueSeatForm from "@features/venue-form/ui/VenueSeatForm";

vi.mock("@features/venue-form/ui/VenueLayoutEditor", () => ({
  default: ({ setSelectedSeatIndices }: { setSelectedSeatIndices: (indices: number[]) => void }) => (
    <div>
      <button onClick={() => setSelectedSeatIndices([])}>선택 해제</button>
      <button onClick={() => setSelectedSeatIndices([0])}>하나 선택</button>
      <button onClick={() => setSelectedSeatIndices([0, 1])}>여러 개 선택</button>
    </div>
  ),
}));

vi.mock("@features/venue-form/ui/SeatBatchCreator", () => ({
  default: ({ onAddSeats }: { onAddSeats: (seats: CreateVenueSeatRequest[]) => void }) => (
    <button onClick={() => onAddSeats([{ sectionName: "C", seatNumber: 1, seatLabel: "C1", price: 1, positionX: 1, positionY: 1 }])}>
      일괄 추가
    </button>
  ),
}));

const venue: CreateVenueRequest = {
  name: "공연장",
  address: "주소",
  description: null,
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 40,
  stageHeight: 10,
};
const initialSeats: CreateVenueSeatRequest[] = [
  { sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10, positionX: 20, positionY: 30 },
  { sectionName: "B", seatNumber: 1, seatLabel: "", price: 20, positionX: 40, positionY: 30 },
];

const TestForm = ({ initialErrors = {}, isSubmitting = false }: { initialErrors?: VenueFormErrors; isSubmitting?: boolean }) => {
  const [currentVenue, setVenue] = useState(venue);
  const [venueSeats, setVenueSeats] = useState(initialSeats);
  const [errors, setErrors] = useState(initialErrors);
  return (
    <VenueSeatForm
      venue={currentVenue}
      venueSeats={venueSeats}
      errors={errors}
      isSubmitting={isSubmitting}
      setVenue={setVenue}
      setVenueSeats={setVenueSeats}
      setErrors={setErrors}
    />
  );
};

describe("VenueSeatForm", () => {
  it("빈 선택, 단일 선택 편집, 목록 선택과 좌석 추가를 처리한다", () => {
    render(<TestForm initialErrors={{ venueSeats: "좌석 오류", "seat.0.sectionName": "구역 오류" }} />);
    expect(screen.getByText("편집할 좌석을 선택하세요")).toBeInTheDocument();
    expect(screen.getByText("좌석 오류")).toBeInTheDocument();

    fireEvent.click(screen.getByText("하나 선택"));
    expect(screen.getByText("선택 좌석 편집")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/구역명/), { target: { value: "AA" } });
    fireEvent.change(screen.getByLabelText(/좌석 번호/), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/좌석 표시/), { target: { value: "AA3" } });
    fireEvent.change(screen.getByLabelText(/가격/), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText(/X 좌표/), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText(/Y 좌표/), { target: { value: "35" } });
    expect(screen.getByDisplayValue("AA3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AA3" }));
    fireEvent.click(screen.getByRole("button", { name: "좌석 2" }), { shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "좌석 2" }), { shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "좌석 추가" }));
    fireEvent.click(screen.getByText("일괄 추가"));
  });

  it("다중 선택 좌석을 모두 삭제하고 실행 취소한다", () => {
    render(<TestForm />);
    fireEvent.click(screen.getByText("여러 개 선택"));
    expect(screen.getByText("좌석 2개 선택됨")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /선택 좌석 모두 삭제/ }));
    expect(screen.getByText("편집할 좌석을 선택하세요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "마지막 배치 변경 실행 취소" }));
    expect(screen.getByRole("button", { name: "A1" })).toBeInTheDocument();
  });

  it("단일 좌석을 삭제하고 제출 중 버튼을 비활성화한다", () => {
    render(<TestForm isSubmitting />);
    fireEvent.click(screen.getByText("하나 선택"));
    expect(screen.getByRole("button", { name: "선택 좌석 삭제" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "좌석 추가" })).toBeDisabled();
  });

  it("단일 좌석 삭제 버튼으로 선택 좌석을 제거한다", () => {
    render(<TestForm />);
    fireEvent.click(screen.getByText("하나 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 좌석 삭제" }));
    expect(screen.queryByRole("button", { name: "A1" })).not.toBeInTheDocument();
  });

  it("오류가 있는 좌석을 목록에서 강조한다", () => {
    render(<TestForm initialErrors={{ "seat.1.seatLabel": "좌석 표시를 입력해 주세요." }} />);

    expect(screen.getByRole("button", { name: "좌석 2" })).toHaveClass("border-red-300", "bg-red-50", "text-red-700");
    expect(screen.getByText("편집할 좌석을 선택하세요")).toBeInTheDocument();
  });
});
