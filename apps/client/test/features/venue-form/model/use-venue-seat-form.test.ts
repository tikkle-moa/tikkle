import { useRef, useState } from "react";

import { act, renderHook } from "@testing-library/react";

import type { CreateVenueRequest } from "@entities/venue";

import { useVenueSeatForm } from "@features/venue-form/model/use-venue-seat-form";
import type { VenueFormErrors, VenueFormSeat } from "@features/venue-form/model/venue-form.types";

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

const initialSeats: VenueFormSeat[] = [
  { clientId: 1, sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 },
  { clientId: 2, sectionName: "B", seatNumber: 1, seatLabel: "B1", price: 20_000, positionX: 40, positionY: 30 },
  { clientId: 3, sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 10_000, positionX: 60, positionY: 30 },
];

const useTestVenueSeatForm = () => {
  const [currentVenue, setCurrentVenue] = useState(venue);
  const [venueSeats, setVenueSeats] = useState(initialSeats);
  const [errors, setErrors] = useState<VenueFormErrors>({ venueSeats: "좌석 오류" });
  const venueSeatClientIdRef = useRef(4);
  const form = useVenueSeatForm({
    venue: currentVenue,
    venueSeats,
    errors,
    venueSeatClientIdRef,
    setVenue: setCurrentVenue,
    setVenueSeats,
    setErrors,
  });
  return { currentVenue, venueSeats, errors, setCurrentVenue, ...form };
};

describe("useVenueSeatForm", () => {
  it("저장된 이력이 없으면 실행 취소를 무시한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    act(() => result.current.handleUndo());
    expect(result.current.venueSeats).toEqual(initialSeats);
    expect(result.current.errorSeatClientIds).toEqual(new Set());
  });

  it("좌석 오류 키에서 오류가 있는 좌석 인덱스만 추출한다", () => {
    const useErrorSeatForm = () => {
      const [currentVenue, setCurrentVenue] = useState(venue);
      const [venueSeats, setVenueSeats] = useState(initialSeats);
      const venueSeatClientIdRef = useRef(4);
      const [errors, setErrors] = useState<VenueFormErrors>({
        "seat.1.sectionName": "오류",
        "seat.2.price": "",
        "seat.3.price": "오류",
        name: "오류",
      });
      return useVenueSeatForm({
        venue: currentVenue,
        venueSeats,
        errors,
        venueSeatClientIdRef,
        setVenue: setCurrentVenue,
        setVenueSeats,
        setErrors,
      });
    };
    const { result } = renderHook(useErrorSeatForm);

    expect(result.current.errorSeatClientIds).toEqual(new Set([1, 3]));
  });

  it("선택된 여러 좌석을 모두 삭제하고 선택을 초기화한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.setSelectedSeatClientIds([1, 3]));
    act(() => result.current.handleRemoveSelectedSeats());

    expect(result.current.venueSeats).toEqual([initialSeats[1]]);
    expect(result.current.selectedSeatClientIds).toEqual([]);
    expect(result.current.canUndo).toBe(true);
  });

  it("다중 좌석 삭제를 실행 취소한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.setSelectedSeatClientIds([1, 3]));
    act(() => result.current.handleRemoveSelectedSeats());
    act(() => result.current.handleUndo());

    expect(result.current.venueSeats).toEqual(initialSeats);
    expect(result.current.selectedSeatClientIds).toEqual([]);
    expect(result.current.canUndo).toBe(false);
  });

  it("좌석 추가 시 기존 좌석과 겹치면 충돌 오류가 즉시 계산된다", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.2).mockReturnValueOnce(0.375);
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.handleAddSeat());

    expect(result.current.venueSeats.at(-1)).toMatchObject({ positionX: 21.35, positionY: 30.44 });
    expect(result.current.errorSeatClientIds).toEqual(new Set([1, 4]));
    expect(result.current.collisionMapRef.current.get(1)).toEqual(new Set([4]));
  });

  it("좌표를 직접 수정해 다른 좌석과 겹치면 충돌 오류가 즉시 계산된다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.updateVenueSeat(2, "positionX", 20));

    expect(result.current.errorSeatClientIds).toEqual(new Set([1, 2]));
    expect(result.current.collisionMapRef.current.get(2)).toEqual(new Set([1]));
  });

  it("충돌 중이던 좌석을 삭제하면 남은 좌석의 충돌 오류가 즉시 해제된다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    act(() => result.current.updateVenueSeat(2, "positionX", 20));
    expect(result.current.errorSeatClientIds).toEqual(new Set([1, 2]));

    act(() => result.current.setSelectedSeatClientIds([2]));
    act(() => result.current.handleRemoveSelectedSeats());

    expect(result.current.errorSeatClientIds).toEqual(new Set());
    expect(result.current.collisionMapRef.current.size).toBe(0);
  });

  it("좌석 필드를 수정한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.updateVenueSeat(1, "price", 30_000));

    expect(result.current.venueSeats[0].price).toBe(30_000);
  });

  it("존재하지 않는 단일 좌석 선택은 편집 대상을 만들지 않는다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    act(() => result.current.setSelectedSeatClientIds([999]));
    expect(result.current.currentSeat).toBeNull();
  });

  it("충돌 이력을 깊은 복사해 저장하고 실행 취소 시 복원한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    result.current.collisionMapRef.current = new Map([[1, new Set([2])]]);
    act(() => result.current.saveLayoutSnapshot());
    result.current.collisionMapRef.current.get(1)?.add(3);
    act(() => result.current.handleUndo());
    expect(result.current.collisionMapRef.current).toEqual(new Map([[1, new Set([2])]]));
  });

  it("무대가 좌석과 겹치도록 변경되면 충돌 오류를 즉시 갱신한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.setCurrentVenue((current) => ({ ...current, stagePositionY: 30 })));

    expect(result.current.errorSeatClientIds).toEqual(new Set([2, 3]));
    expect(result.current.collisionMapRef.current.get(2)).toEqual(new Set([-1]));
  });

  it("무대 위치 변경을 실행 취소하면 공연장과 충돌 상태를 함께 복원한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.saveLayoutSnapshot());
    act(() => result.current.setCurrentVenue((current) => ({ ...current, stagePositionY: 30 })));
    expect(result.current.errorSeatClientIds).toEqual(new Set([2, 3]));

    act(() => result.current.handleUndo());

    expect(result.current.currentVenue.stagePositionY).toBe(10);
    expect(result.current.errorSeatClientIds).toEqual(new Set());
    expect(result.current.collisionMapRef.current.size).toBe(0);
  });

  it("좌석 추가 시 랜덤 좌표에 추가하고 새 좌석을 선택한다", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);
    const { result } = renderHook(useTestVenueSeatForm);

    act(() => result.current.handleAddSeat());

    expect(result.current.venueSeats.at(-1)).toMatchObject({ positionX: 26.13, positionY: 59.13 });
    expect(result.current.selectedSeatClientIds).toEqual([4]);
  });

  it("선택 없이 삭제하면 무시하고 좌석 묶음을 추가한다", () => {
    const { result } = renderHook(useTestVenueSeatForm);
    act(() => result.current.handleRemoveSelectedSeats());
    expect(result.current.venueSeats).toHaveLength(3);
    act(() => result.current.handleAddSeats([{ ...initialSeats[0], clientId: 4, seatNumber: 3 }]));
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
