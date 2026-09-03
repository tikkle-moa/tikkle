import { act, renderHook } from "@testing-library/react";

import { useVenueSeatList } from "@features/venue-form/model/use-venue-seat-list";
import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";

const seats: VenueFormSeat[] = Array.from({ length: 40 }, (_, index) => ({
  clientId: index,
  sectionName: "A",
  seatNumber: index + 1,
  seatLabel: `A${index + 1}`,
  price: 10_000,
  positionX: index,
  positionY: index,
}));

describe("useVenueSeatList", () => {
  it("스크롤 위치에 맞는 좌석을 제공한다", () => {
    const { result } = renderHook(() =>
      useVenueSeatList({ venueSeats: seats, selectedSeatClientIdSet: new Set(), errorSeatClientIds: new Set(), setSelectedSeatClientIds: vi.fn() }),
    );

    act(() => result.current.handleScroll({ currentTarget: { scrollTop: 200 } } as never));

    expect(result.current.firstVisibleRow).toBeGreaterThan(0);
  });

  it("선택된 좌석을 맨 앞에, 오류 좌석을 다음에 두고 나머지는 원래 순서를 유지한다", () => {
    const { result } = renderHook(() =>
      useVenueSeatList({
        venueSeats: seats,
        selectedSeatClientIdSet: new Set([5, 10]),
        errorSeatClientIds: new Set([20, 30]),
        setSelectedSeatClientIds: vi.fn(),
      }),
    );

    expect(result.current.visibleSeats.slice(0, 4).map((seat) => seat.clientId)).toEqual([5, 10, 20, 30]);
  });

  it("일반 클릭과 Shift 추가 및 해제를 처리한다", () => {
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useVenueSeatList({ venueSeats: seats, selectedSeatClientIdSet: new Set(), errorSeatClientIds: new Set(), setSelectedSeatClientIds: setter }),
    );
    const button = document.createElement("button");
    button.dataset.seatClientId = "2";
    const container = document.createElement("div");
    container.append(button);

    act(() => result.current.handleClick({ target: button, currentTarget: container, shiftKey: false } as never));
    act(() => result.current.handleClick({ target: button, currentTarget: container, shiftKey: true } as never));
    const replace = setter.mock.calls[0][0];
    const toggle = setter.mock.calls[1][0];
    expect(replace([1])).toEqual([2]);
    expect(toggle([1])).toEqual([1, 2]);
    expect(toggle([1, 2])).toEqual([1]);
  });

  it("좌석 버튼이 아니거나 외부 버튼 또는 잘못된 ID이면 무시한다", () => {
    const setter = vi.fn();
    const { result } = renderHook(() =>
      useVenueSeatList({ venueSeats: seats, selectedSeatClientIdSet: new Set(), errorSeatClientIds: new Set(), setSelectedSeatClientIds: setter }),
    );
    const container = document.createElement("div");
    const outside = document.createElement("button");
    outside.dataset.seatClientId = "1";
    const invalid = document.createElement("button");
    invalid.dataset.seatClientId = "invalid";
    container.append(invalid);

    act(() => result.current.handleClick({ target: container, currentTarget: container } as never));
    act(() => result.current.handleClick({ target: outside, currentTarget: container } as never));
    act(() => result.current.handleClick({ target: invalid, currentTarget: container } as never));
    expect(setter).not.toHaveBeenCalled();
  });
});
