import type { SubmitEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import { usePerformanceForm } from "@features/performance-form/model/use-performance-form";

const { mockCreatePerformance, mockToastSuccess, mockUpdatePerformance } = vi.hoisted(() => ({
  mockCreatePerformance: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockUpdatePerformance: vi.fn(),
}));

vi.mock("@features/performance-form/model/performance-form.api", () => ({
  createPerformance: mockCreatePerformance,
  updatePerformance: mockUpdatePerformance,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mockToastSuccess,
  },
}));

const initialValues = {
  name: "1회차",
  startsAt: "2099-09-01T19:00",
  bookingOpensAt: "2099-08-30T19:00",
};

const renderPerformanceForm = (overrides: Partial<Parameters<typeof usePerformanceForm>[0]> = {}) => {
  const props = {
    concertId: 7,
    initialValues,
    onSaved: vi.fn().mockResolvedValue(undefined),
    onSuccess: vi.fn(),
    ...overrides,
  };

  const hook = renderHook(() => usePerformanceForm(props));

  return {
    ...hook,
    props,
  };
};

const submit = async (result: ReturnType<typeof renderPerformanceForm>["result"]) => {
  await act(async () => {
    await result.current.handleSubmit({
      preventDefault: vi.fn(),
    } as unknown as SubmitEvent<HTMLFormElement>);
  });
};

describe("usePerformanceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("초기값을 사용하고 입력값을 변경한다", () => {
    const { result } = renderPerformanceForm();

    expect(result.current.values).toEqual(initialValues);

    act(() => {
      result.current.updateField("name", "2회차");
      result.current.updateField("startsAt", "2099-09-02T19:00");
    });

    expect(result.current.values).toEqual({
      name: "2회차",
      startsAt: "2099-09-02T19:00",
      bookingOpensAt: initialValues.bookingOpensAt,
    });
  });

  it("예매 시작 시각 없이도 생성 저장을 완료한다", async () => {
    mockCreatePerformance.mockResolvedValue(undefined);

    const { result, props } = renderPerformanceForm({
      initialValues: {
        ...initialValues,
        bookingOpensAt: "",
      },
    });

    await submit(result);

    expect(props.onSaved).toHaveBeenCalledOnce();
    expect(props.onSuccess).toHaveBeenCalledOnce();
  });

  it("예매 시작 시각이 있는 회차 수정 저장을 완료한다", async () => {
    mockUpdatePerformance.mockResolvedValue(undefined);

    const { result, props } = renderPerformanceForm({
      performanceId: 1,
    });

    await submit(result);

    expect(props.onSaved).toHaveBeenCalledOnce();
    expect(props.onSuccess).toHaveBeenCalledOnce();
  });

  it("예매 시작 시각 없이도 수정 저장을 완료한다", async () => {
    mockUpdatePerformance.mockResolvedValue(undefined);

    const { result, props } = renderPerformanceForm({
      initialValues: {
        ...initialValues,
        bookingOpensAt: "",
      },
      performanceId: 1,
    });

    await submit(result);

    expect(props.onSaved).toHaveBeenCalledOnce();
    expect(props.onSuccess).toHaveBeenCalledOnce();
  });

  it("회차명이 없으면 저장 완료 콜백을 호출하지 않는다", async () => {
    const { result, props } = renderPerformanceForm({
      initialValues: {
        ...initialValues,
        name: "   ",
      },
    });

    await submit(result);

    expect(result.current.errors.name).toBe("공연 회차명을 입력해 주세요.");
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onSuccess).not.toHaveBeenCalled();
  });

  it("공연 시작 시각이 없으면 저장 완료 콜백을 호출하지 않는다", async () => {
    const { result, props } = renderPerformanceForm({
      initialValues: {
        ...initialValues,
        startsAt: "",
        bookingOpensAt: "",
      },
    });

    await submit(result);

    expect(result.current.errors.startsAt).toBe("공연 시작 시각을 입력해 주세요.");
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onSuccess).not.toHaveBeenCalled();
  });

  it("생성 저장에 성공하면 목록을 갱신하고 폼 완료 콜백을 호출한다", async () => {
    mockCreatePerformance.mockResolvedValue(undefined);

    const { result, props } = renderPerformanceForm();

    await submit(result);

    expect(props.onSaved).toHaveBeenCalledOnce();
    expect(props.onSuccess).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith("공연 회차를 등록했습니다.");
  });

  it("수정 저장에 성공하면 목록을 갱신하고 폼 완료 콜백을 호출한다", async () => {
    mockUpdatePerformance.mockResolvedValue(undefined);

    const { result, props } = renderPerformanceForm({
      performanceId: 1,
    });

    await submit(result);

    expect(props.onSaved).toHaveBeenCalledOnce();
    expect(props.onSuccess).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith("공연 회차를 수정했습니다.");
  });

  it("저장 처리에 실패하면 오류 상태를 설정하고 완료 콜백을 호출하지 않는다", async () => {
    mockCreatePerformance.mockRejectedValue(new Error("저장 실패"));

    const { result, props } = renderPerformanceForm();

    await submit(result);

    expect(result.current.submitState).toEqual({
      status: "error",
      error: "공연 회차 저장 중 오류가 발생했습니다.",
    });
    expect(props.onSaved).not.toHaveBeenCalled();
    expect(props.onSuccess).not.toHaveBeenCalled();
  });

  it("목록 갱신에 실패하면 오류 상태를 설정한다", async () => {
    mockCreatePerformance.mockResolvedValue(undefined);

    const { result, props } = renderPerformanceForm({
      onSaved: vi.fn().mockRejectedValue(new Error("목록 갱신 실패")),
    });

    await submit(result);

    expect(result.current.submitState).toEqual({
      status: "error",
      error: "공연 회차 저장 중 오류가 발생했습니다.",
    });
    expect(props.onSuccess).not.toHaveBeenCalled();
  });
});
