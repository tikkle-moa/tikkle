import { render, screen } from "@testing-library/react";

import type { CreateVenueRequest } from "@entities/venue";

import SeatBatchCreator from "@features/venue-form/ui/SeatBatchCreator";

vi.mock("@features/venue-form/model/use-seat-batch", () => ({
  useSeatBatch: () => ({
    values: {
      sectionName: "A",
      rows: 1,
      columns: 1,
      startSeatNumber: 1,
      price: 0,
      startX: 0,
      startY: 0,
      gapX: 1,
      gapY: 1,
    },
    error: null,
    count: Number.NaN,
    changeHandlers: {
      sectionName: vi.fn(),
      rows: vi.fn(),
      columns: vi.fn(),
      startSeatNumber: vi.fn(),
      price: vi.fn(),
      startX: vi.fn(),
      startY: vi.fn(),
      gapX: vi.fn(),
      gapY: vi.fn(),
    },
    handleCreate: vi.fn(),
  }),
}));

describe("SeatBatchCreator non-finite count", () => {
  it("유한하지 않은 생성 개수는 0으로 표시하고 버튼을 비활성화한다", () => {
    const venueSeatClientIdRef = { current: 1 };
    render(
      <SeatBatchCreator
        venue={{ width: 100, height: 100 } as CreateVenueRequest}
        venueSeats={[]}
        venueSeatClientIdRef={venueSeatClientIdRef}
        isSubmitting={false}
        onAddSeats={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "0개 좌석 생성" })).toBeDisabled();
  });
});
