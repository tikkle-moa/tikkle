import { useState } from "react";

import { act, renderHook } from "@testing-library/react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { useVenueSeatForm } from "@features/venue-form/model/use-venue-seat-form";
import type { VenueFormErrors } from "@features/venue-form/model/venue-form.types";

const venue: CreateVenueRequest = {
  name: "공연장",
  address: "서울시",
  description: null,
  width: 100,
  height: 80,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 40,
  stageHeight: 10,
};

const initialSeats: CreateVenueSeatRequest[] = [
  { sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 },
  { sectionName: "B", seatNumber: 1, seatLabel: "B1", price: 20_000, positionX: 40, positionY: 30 },
  { sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 10_000, positionX: 60, positionY: 30 },
];

const useTestVenueSeatForm = () => {
  const [currentVenue, setVenue] = useState(venue);
  const [venueSeats, setVenueSeats] = useState(initialSeats);
  const [errors, setErrors] = useState<VenueFormErrors>({ venueSeats: "좌석 오류" });
  const form = useVenueSeatForm({ venue: currentVenue, venueSeats, errors, setVenue, setVenueSeats, setErrors });
  return { currentVenue, venueSeats, errors, ...form };
};

describe("useVenueSeatForm", () => {
  it("저장된 이력이 없으면 실행 취소를 무시한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    act(() => result.current.handleUndo());
    expect(result.current.venueSeats).toEqual(initialSeats);
    expect(result.current.errorSeatIndices).toEqual(new Set());
  });

  it("좌석 오류 키에서 오류가 있는 좌석 인덱스만 추출한다", () => {
    const useErrorSeatForm = () => {
      const [currentVenue, setVenue] = useState(venue);
      const [venueSeats, setVenueSeats] = useState(initialSeats);
      const [errors, setErrors] = useState<VenueFormErrors>({ "seat.0.sectionName": "오류", "seat.2.price": "오류", name: "오류" });
      return useVenueSeatForm({ venue: currentVenue, venueSeats, errors, setVenue, setVenueSeats, setErrors });
    };
    const { result } = renderHook(useErrorSeatForm);

    expect(result.current.errorSeatIndices).toEqual(new Set([0, 2]));
  });

  it("선택된 여러 좌석을 모두 삭제하고 선택 및 오류를 초기화한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.setSelectedSeatIndices([0, 2]));
    act(() => result.current.handleRemoveSelectedSeats());

    expect(result.current.venueSeats).toEqual([initialSeats[1]]);
    expect(result.current.selectedSeatIndices).toEqual([]);
    expect(result.current.errors).toEqual({});
    expect(result.current.canUndo).toBe(true);
  });

  it("다중 좌석 삭제를 실행 취소한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.setSelectedSeatIndices([0, 2]));
    act(() => result.current.handleRemoveSelectedSeats());
    act(() => result.current.handleUndo());

    expect(result.current.venueSeats).toEqual(initialSeats);
    expect(result.current.selectedSeatIndices).toEqual([]);
    expect(result.current.canUndo).toBe(false);
  });

  it("좌석 필드를 수정하고 해당 오류를 해제한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.updateVenueSeat(1, "price", 30_000));

    expect(result.current.venueSeats[1].price).toBe(30_000);
    expect(result.current.errors["seat.1.price"]).toBe("");
    expect(result.current.errors.venueSeats).toBe("");
  });

  it("좌석 추가 시 랜덤 좌표에 추가하고 새 좌석을 선택한다", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.handleAddSeat());

    expect(result.current.venueSeats.at(-1)).toMatchObject({ positionX: 25, positionY: 60 });
    expect(result.current.selectedSeatIndices).toEqual([3]);
  });

  it("선택 없이 삭제하면 무시하고 좌석 묶음을 추가한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    act(() => result.current.handleRemoveSelectedSeats());
    expect(result.current.venueSeats).toHaveLength(3);
    act(() => result.current.handleAddSeats([{ ...initialSeats[0], seatNumber: 3 }]));
    expect(result.current.venueSeats).toHaveLength(4);
  });

  it("Cmd/Ctrl+Z 단축키를 처리하되 입력 요소와 다른 키는 무시한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    act(() => result.current.handleAddSeat());
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "x", metaKey: true, cancelable: true })));
    expect(result.current.venueSeats).toHaveLength(4);
    const input = document.createElement("input");
    document.body.append(input);
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, bubbles: true, cancelable: true })));
    expect(result.current.venueSeats).toHaveLength(4);
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    document.body.append(textarea, select);
    act(() => textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, bubbles: true, cancelable: true })));
    act(() => select.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, bubbles: true, cancelable: true })));
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, shiftKey: true, cancelable: true })));
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, cancelable: true })));
    expect(result.current.venueSeats).toEqual(initialSeats);
  });
});
