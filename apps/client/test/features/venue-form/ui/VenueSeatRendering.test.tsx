import { render } from "@testing-library/react";

import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";
import VenueSeatChunk from "@features/venue-form/ui/VenueSeatChunk";
import VenueSeatItem from "@features/venue-form/ui/VenueSeatItem";
import VenueSeatLayout from "@features/venue-form/ui/VenueSeatLayout";
import VenueSeatList from "@features/venue-form/ui/VenueSeatList";

const first: VenueFormSeat = {
  clientId: 1,
  sectionName: "A",
  seatNumber: 1,
  seatLabel: "A1",
  price: 10_000,
  positionX: 10,
  positionY: 20,
};
const second = { ...first, clientId: 2, seatNumber: 2, seatLabel: "" };

describe("venue seat rendering", () => {
  it("좌석 아이템의 제출·선택·오류·기본 제목 상태를 렌더링한다", () => {
    const { container, rerender } = render(
      <svg>
        <VenueSeatItem seat={second} selected={false} hasError={false} isSubmitting />
      </svg>,
    );
    expect(container.querySelector("title")?.textContent).toContain("좌석 2");
    rerender(
      <svg>
        <VenueSeatItem seat={first} selected hasError={false} isSubmitting={false} />
      </svg>,
    );
    expect(container.querySelector("rect")?.getAttribute("stroke")).toBe("#fef3c7");
  });

  it("좌석 청크의 메모 비교 조건과 좌석 경로 재사용을 처리한다", () => {
    const seats = [first, second];
    const { rerender } = render(
      <svg>
        <VenueSeatChunk seats={seats} isSubmitting={false} />
      </svg>,
    );
    rerender(
      <svg>
        <VenueSeatChunk seats={seats} isSubmitting={false} />
      </svg>,
    );
    rerender(
      <svg>
        <VenueSeatChunk seats={seats} isSubmitting />
      </svg>,
    );
    rerender(
      <svg>
        <VenueSeatChunk seats={[first]} isSubmitting />
      </svg>,
    );
    rerender(
      <svg>
        <VenueSeatChunk seats={[{ ...first }]} isSubmitting />
      </svg>,
    );
  });

  it("없는 강조 좌석은 건너뛰고 존재하는 선택·오류 좌석은 상단 레이어에 렌더링한다", () => {
    const { container } = render(
      <svg>
        <VenueSeatLayout
          venueSeats={[first, second]}
          selectedSeatClientIdSet={new Set([1, 999])}
          errorSeatClientIds={new Set([1, 2])}
          isSubmitting={false}
          onPointerDown={vi.fn()}
        />
      </svg>,
    );
    expect(container.querySelectorAll("g[data-seat-client-id]")).toHaveLength(2);
  });

  it("좌석 목록 메모 비교의 동일·변경 조건을 처리한다", () => {
    const selected = new Set<number>();
    const errors = new Set<number>();
    const setter = vi.fn();
    const { rerender } = render(
      <VenueSeatList venueSeats={[first]} selectedSeatClientIdSet={selected} errorSeatClientIds={errors} setSelectedSeatClientIds={setter} />,
    );
    rerender(<VenueSeatList venueSeats={[first]} selectedSeatClientIdSet={selected} errorSeatClientIds={errors} setSelectedSeatClientIds={setter} />);
    rerender(
      <VenueSeatList venueSeats={[{ ...first }]} selectedSeatClientIdSet={selected} errorSeatClientIds={errors} setSelectedSeatClientIds={setter} />,
    );
    rerender(
      <VenueSeatList
        venueSeats={[{ ...first, seatLabel: "변경" }]}
        selectedSeatClientIdSet={selected}
        errorSeatClientIds={errors}
        setSelectedSeatClientIds={setter}
      />,
    );
    rerender(
      <VenueSeatList
        venueSeats={[{ ...first, clientId: 9 }]}
        selectedSeatClientIdSet={selected}
        errorSeatClientIds={errors}
        setSelectedSeatClientIds={setter}
      />,
    );
    rerender(
      <VenueSeatList venueSeats={[first, second]} selectedSeatClientIdSet={selected} errorSeatClientIds={errors} setSelectedSeatClientIds={setter} />,
    );
    rerender(
      <VenueSeatList
        venueSeats={[first, second]}
        selectedSeatClientIdSet={new Set()}
        errorSeatClientIds={errors}
        setSelectedSeatClientIds={setter}
      />,
    );
  });
});
