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
  it("초기값을 복사하고 필드 수정 시 오류를 해제한다", () => {
    const { result } = renderHook(() => useVenueForm({ initialValues, submitState: { status: "idle" }, onSubmit: vi.fn() }));

    expect(result.current.venue).toEqual(initialValues.venue);
    expect(result.current.venueSeats).toEqual(initialValues.venueSeats);
    act(() => result.current.setErrors({ name: "오류" }));
    expect(result.current.errorCount).toBe(1);
    expect(result.current.errorSections).toEqual(["기본 정보"]);
    act(() => result.current.updateVenue("name", "새 공연장"));
    expect(result.current.venue.name).toBe("새 공연장");
    expect(result.current.errors.name).toBe("");
    expect(result.current.errorCount).toBe(0);
    expect(result.current.errorSections).toEqual([]);
  });

  it("초기값이 없으면 빈 폼을 사용하고 제출 중 상태를 제공한다", () => {
    const { result } = renderHook(() => useVenueForm({ submitState: { status: "submitting" }, onSubmit: vi.fn() }));
    expect(result.current.venue.name).toBe("");
    expect(result.current.isSubmitting).toBe(true);
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

  it("좌석 에디터가 변경될 때마다 폼 오류를 다시 계산한다", () => {
    const { result } = renderHook(() => useVenueForm({ initialValues, submitState: { status: "idle" }, onSubmit: vi.fn() }));
    const duplicatedPositionSeat = {
      ...initialValues.venueSeats[0],
      sectionName: "B",
      seatNumber: 2,
      positionX: 20.004,
      positionY: 30.004,
    };

    act(() => result.current.setVenueSeats((current) => [...current, duplicatedPositionSeat]));

    expect(result.current.errors["seat.1.positionX"]).toBe("같은 좌표에 중복된 좌석이 있습니다.");

    act(() => result.current.setVenueSeats((current) => current.slice(0, 1)));

    expect(result.current.errors).toEqual({});
  });
});
