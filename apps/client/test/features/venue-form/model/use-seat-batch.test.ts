import { act, renderHook } from "@testing-library/react";

import type { CreateVenueRequest } from "@entities/venue";

import { useSeatBatch } from "@features/venue-form/model/use-seat-batch";

const venue = { width: 100, height: 100 } as CreateVenueRequest;

describe("useSeatBatch", () => {
  it("값을 변경하면 오류를 해제하고 좌석을 생성한 뒤 시작 번호를 증가시킨다", () => {
    const onAddSeats = vi.fn();
    const { result } = renderHook(() => useSeatBatch({ venue, onAddSeats }));

    act(() => result.current.updateValue("startX", 101));
    act(() => result.current.handleCreate());
    expect(result.current.error).toBe("생성될 좌석이 공연장 범위를 벗어납니다.");
    expect(onAddSeats).not.toHaveBeenCalled();

    act(() => result.current.updateValue("startX", 20));
    expect(result.current.error).toBeNull();
    act(() => result.current.handleCreate());

    expect(onAddSeats).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ sectionName: "A구역", seatNumber: 1 })]));
    expect(result.current.values.startSeatNumber).toBe(16);
  });
});
