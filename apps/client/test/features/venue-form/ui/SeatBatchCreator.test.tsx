import { fireEvent, render, screen } from "@testing-library/react";

import type { CreateVenueRequest } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";
import SeatBatchCreator from "@features/venue-form/ui/SeatBatchCreator";

const venue = { width: 100, height: 100, stagePositionX: 80, stagePositionY: 80, stageWidth: 10, stageHeight: 10 } as CreateVenueRequest;
const venueSeats: VenueFormSeat[] = [
  { clientId: 1, sectionName: "A구역", seatNumber: 1, seatLabel: "A구역 1번", price: 10_000, positionX: 10, positionY: 10 },
  { clientId: 2, sectionName: "A구역", seatNumber: 2, seatLabel: "A구역 2번", price: 10_000, positionX: 15, positionY: 10 },
];
const createClientIdRef = () => ({ current: 3 });

describe("SeatBatchCreator", () => {
  it("입력값을 수정하여 좌석을 일괄 생성한다", () => {
    const onAddSeats = vi.fn();
    render(
      <SeatBatchCreator
        venue={venue}
        venueSeats={venueSeats}
        venueSeatClientIdRef={createClientIdRef()}
        isSubmitting={false}
        onAddSeats={onAddSeats}
      />,
    );

    fireEvent.change(screen.getByLabelText(/행/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/열/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/구역명/), { target: { value: "B구역" } });
    fireEvent.change(screen.getByLabelText(/시작 좌석 번호/), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/가격/), { target: { value: "30000" } });
    fireEvent.change(screen.getByLabelText(/시작 X/), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText(/시작 Y/), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText(/가로 간격/), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/세로 간격/), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /4개 좌석 생성/ }));

    expect(onAddSeats).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ sectionName: "B구역", seatNumber: 10, price: 30_000 })]),
    );
  });

  it("잘못된 배치에는 오류를 표시하고 제출 중에는 비활성화한다", () => {
    const venueSeatClientIdRef = createClientIdRef();
    const { rerender } = render(
      <SeatBatchCreator
        venue={venue}
        venueSeats={venueSeats}
        venueSeatClientIdRef={venueSeatClientIdRef}
        isSubmitting={false}
        onAddSeats={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/시작 X/), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /좌석 생성/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("공연장 범위를 벗어납니다");

    rerender(
      <SeatBatchCreator venue={venue} venueSeats={venueSeats} venueSeatClientIdRef={venueSeatClientIdRef} isSubmitting onAddSeats={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /좌석 생성/ })).toBeDisabled();
  });
});
