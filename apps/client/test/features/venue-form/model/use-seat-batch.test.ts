import { act, renderHook } from "@testing-library/react";

import type { CreateVenueRequest } from "@entities/venue";

import { useSeatBatch } from "@features/venue-form/model/use-seat-batch";
import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";

const venue = { width: 100, height: 100, stagePositionX: 80, stagePositionY: 80, stageWidth: 10, stageHeight: 10 } as CreateVenueRequest;
const createClientIdRef = () => ({ current: 1 });

describe("useSeatBatch", () => {
  it("값을 변경하면 오류를 해제하고 좌석을 생성한 뒤 시작 번호를 증가시킨다", () => {
    const onAddSeats = vi.fn();
    const { result } = renderHook(() => useSeatBatch({ venue, venueSeats: [], venueSeatClientIdRef: createClientIdRef(), onAddSeats }));

    act(() => result.current.changeHandlers.startX(101));
    act(() => result.current.handleCreate());
    expect(result.current.error).toBe("생성될 좌석이 공연장 범위를 벗어납니다.");
    expect(onAddSeats).not.toHaveBeenCalled();

    act(() => result.current.changeHandlers.startX(20));
    expect(result.current.error).toBeNull();
    act(() => result.current.handleCreate());

    expect(onAddSeats).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ sectionName: "A구역", seatNumber: 1 })]));
    expect(result.current.values.startSeatNumber).toBe(16);
  });

  it("기존 좌석과 중복되는 일괄 좌석은 생성하지 않는다", () => {
    const onAddSeats = vi.fn();
    const venueSeats: VenueFormSeat[] = [
      { clientId: 1, sectionName: "A구역", seatNumber: 1, seatLabel: "A구역 1번", price: 50_000, positionX: 10, positionY: 10 },
    ];
    const { result } = renderHook(() => useSeatBatch({ venue, venueSeats, venueSeatClientIdRef: createClientIdRef(), onAddSeats }));

    act(() => result.current.handleCreate());

    expect(result.current.error).toBe("같은 구역에 중복된 좌석 번호가 있습니다.");
    expect(onAddSeats).not.toHaveBeenCalled();
  });
});
