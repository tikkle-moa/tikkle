import type { SubmitEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import type { CreateVenueDetailRequest } from "@entities/venue";

import { useVenueForm } from "@features/venue-form/model/use-venue-form";

const initialValues: CreateVenueDetailRequest = {
  venue: {
    name: "공연장",
    address: "서울시",
    description: null,
    width: 100,
    height: 100,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 40,
    stageHeight: 10,
  },
  venueSeats: [{ sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 10_000, positionX: 20, positionY: 30 }],
};

const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;

describe("useVenueForm", () => {
  it("초기값을 복사하고 필드 수정 시 오류를 해제한다", async () => {
    const invalidInitialValues = {
      ...initialValues,
      venue: { ...initialValues.venue, name: " " },
    };
    const { result } = renderHook(() => useVenueForm({ initialValues: invalidInitialValues, submitState: { status: "idle" }, onSubmit: vi.fn() }));

    expect(result.current.venue).toEqual(invalidInitialValues.venue);
    expect(result.current.venueSeats).toEqual([{ clientId: 1, ...initialValues.venueSeats[0] }]);

    await act(() => result.current.handleSubmit(submitEvent));

    expect(result.current.errorCount).toBe(1);
    expect(result.current.errorSections).toEqual(["기본 정보"]);

    act(() => result.current.updateVenue("name", "새 공연장"));

    expect(result.current.venue.name).toBe("새 공연장");
    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errorCount).toBe(0);
    expect(result.current.errorSections).toEqual([]);
  });

  it("초기값이 없으면 빈 폼을 사용하고 제출 중 상태를 제공한다", () => {
    const { result } = renderHook(() => useVenueForm({ submitState: { status: "submitting" }, onSubmit: vi.fn() }));
    expect(result.current.venue.name).toBe("");
    expect(result.current.isSubmitting).toBe(true);

    act(() => result.current.setErrors({ name: "" }));
    expect(result.current.errorCount).toBe(0);
  });

  it("유효하지 않은 폼은 오류를 표시하고 제출하지 않는다", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useVenueForm({ submitState: { status: "idle" }, onSubmit }));
    await act(() => result.current.handleSubmit(submitEvent));
    expect(result.current.errors.name).toBeTruthy();
    expect(result.current.errorCount).toBeGreaterThan(0);
    expect(result.current.errorSections).toEqual(["기본 정보", "좌석 정보"]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("유효한 폼을 정리하여 제출한다", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useVenueForm({ initialValues, submitState: { status: "idle" }, onSubmit }));
    await act(() => result.current.handleSubmit(submitEvent));
    expect(onSubmit).toHaveBeenCalledWith(initialValues);
  });

  it("좌석 목록을 변경할 때 제출 검증 오류를 미리 노출하지 않는다", () => {
    const { result } = renderHook(() => useVenueForm({ initialValues, submitState: { status: "idle" }, onSubmit: vi.fn() }));
    const emptySeat = {
      clientId: 2,
      sectionName: "A구역",
      seatNumber: 1,
      seatLabel: "A구역 1번",
      price: 0,
      positionX: 50,
      positionY: 50,
    };

    act(() => result.current.setVenueSeats((current) => [...current, emptySeat]));
    expect(result.current.errors).toEqual({});

    expect(result.current.errors).toEqual({});
  });

  it("제출 시 충돌한 좌석의 clientId를 사용해 오류를 저장한다", async () => {
    const overlappingInitialValues = {
      ...initialValues,
      venueSeats: [
        initialValues.venueSeats[0],
        { ...initialValues.venueSeats[0], sectionName: "B", seatNumber: 2, seatLabel: "B2", positionX: 24, positionY: 33 },
      ],
    };
    const { result } = renderHook(() =>
      useVenueForm({ initialValues: overlappingInitialValues, submitState: { status: "idle" }, onSubmit: vi.fn() }),
    );

    await act(() => result.current.handleSubmit(submitEvent));
    expect(result.current.errors["seat.1.positionX"]).toBeTruthy();
    expect(result.current.errors["seat.2.positionX"]).toBeTruthy();
  });
});
