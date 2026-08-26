import { act, renderHook } from "@testing-library/react";

import { usePerformanceForm } from "@features/performance-form/model/use-performance-form";

const initialValues = {
  startsAt: "2099-09-01T19:00",
  bookingOpensAt: "2099-08-30T19:00",
};

describe("usePerformanceForm", () => {
  it("초기값을 폼 상태로 사용한다", () => {
    const { result } = renderHook(() =>
      usePerformanceForm({
        initialValues,
        submitState: { status: "idle" },
        onSubmit: vi.fn(),
      }),
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
  });

  it("입력값을 변경한다", () => {
    const { result } = renderHook(() =>
      usePerformanceForm({
        submitState: { status: "idle" },
        onSubmit: vi.fn(),
      }),
    );

    act(() => {
      result.current.updateField("startsAt", initialValues.startsAt);
    });

    expect(result.current.values.startsAt).toBe(initialValues.startsAt);
  });

  it("유효한 값을 제출한다", async () => {
    const onSubmit = vi.fn();

    const { result } = renderHook(() =>
      usePerformanceForm({
        initialValues,
        submitState: { status: "idle" },
        onSubmit,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.SubmitEvent<HTMLFormElement>);
    });

    expect(onSubmit).toHaveBeenCalledWith(initialValues);
  });

  it("유효하지 않은 값은 제출하지 않고 오류를 설정한다", async () => {
    const onSubmit = vi.fn();

    const { result } = renderHook(() =>
      usePerformanceForm({
        initialValues: {
          startsAt: initialValues.startsAt,
          bookingOpensAt: "2099-09-02T19:00",
        },
        submitState: { status: "idle" },
        onSubmit,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.SubmitEvent<HTMLFormElement>);
    });

    expect(result.current.errors.bookingOpensAt).toBe("예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
