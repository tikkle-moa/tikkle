import { act, renderHook } from "@testing-library/react";

import { usePerformanceForm } from "@features/performance-form/model/use-performance-form";

const { mockDelete, mockPatch, mockPost, mockToastError } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockPatch: vi.fn(),
  mockPost: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    POST: mockPost,
    PATCH: mockPatch,
    DELETE: mockDelete,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: mockToastError,
  },
}));

const values = {
  startsAt: "2099-09-01T19:00",
  bookingOpensAt: "2099-08-30T19:00",
};

const performance = {
  id: 1,
  concertId: 7,
  startsAt: "2099-09-01T19:00:00",
  bookingOpensAt: null,
  createdAt: "2099-08-01T12:00:00",
};

const renderPerformanceForm = (overrides: Partial<Parameters<typeof usePerformanceForm>[0]> = {}) => {
  const props = {
    concertId: 7,
    defaultCreateOpen: false,
    onChanged: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  const hook = renderHook(() => usePerformanceForm(props));

  return {
    ...hook,
    props,
  };
};

describe("usePerformanceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("기본 추가 모드에서 빈 회차 입력 행을 연다", () => {
    const { result } = renderPerformanceForm({
      defaultCreateOpen: true,
    });

    expect(result.current.editing).toEqual({
      mode: "create",
      key: 0,
    });
  });

  it("회차 추가를 시작하면 빈 회차 입력 행을 연다", () => {
    const { result } = renderPerformanceForm();

    act(() => {
      result.current.handleCreate();
    });

    expect(result.current.editing).toEqual({
      mode: "create",
      key: 0,
    });
    expect(result.current.submitState).toEqual({
      status: "idle",
    });
  });

  it("편집을 취소하면 편집 상태와 제출 상태를 초기화한다", () => {
    const { result } = renderPerformanceForm();

    act(() => {
      result.current.handleEdit(performance);
      result.current.handleCancel();
    });

    expect(result.current.editing).toBeNull();
    expect(result.current.submitState).toEqual({
      status: "idle",
    });
  });

  it("편집 중인 회차가 없으면 저장 요청을 보내지 않는다", async () => {
    const { result } = renderPerformanceForm();

    await act(async () => {
      await result.current.handleSubmit(values);
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("새 회차의 예매 시작 시각이 비어 있으면 null로 등록한다", async () => {
    mockPost.mockResolvedValue({
      data: { data: performance },
      error: undefined,
      response: { ok: true },
    });

    const { result } = renderPerformanceForm({
      defaultCreateOpen: true,
    });

    await act(async () => {
      await result.current.handleSubmit({
        startsAt: values.startsAt,
        bookingOpensAt: "",
      });
    });

    expect(mockPost).toHaveBeenCalledWith("/api/performances", {
      body: {
        concertId: 7,
        startsAt: values.startsAt,
        bookingOpensAt: null,
      },
    });
  });

  it("기존 회차의 예매 시작 시각을 비우면 null로 수정한다", async () => {
    mockPatch.mockResolvedValue({
      data: { data: performance },
      error: undefined,
      response: { ok: true },
    });

    const { result } = renderPerformanceForm();

    act(() => {
      result.current.handleEdit(performance);
    });

    await act(async () => {
      await result.current.handleSubmit({
        startsAt: values.startsAt,
        bookingOpensAt: "",
      });
    });

    expect(mockPatch).toHaveBeenCalledWith("/api/performances/{id}", {
      params: { path: { id: 1 } },
      body: {
        startsAt: values.startsAt,
        bookingOpensAt: null,
      },
    });
  });

  it("새 회차를 등록하고 다음 빈 입력 행을 유지한다", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);

    mockPost.mockResolvedValue({
      data: { data: performance },
      error: undefined,
      response: { ok: true },
    });

    const { result } = renderPerformanceForm({
      defaultCreateOpen: true,
      onChanged,
    });

    await act(async () => {
      await result.current.handleSubmit(values);
    });

    expect(mockPost).toHaveBeenCalledWith("/api/performances", {
      body: {
        concertId: 7,
        ...values,
      },
    });
    expect(onChanged).toHaveBeenCalledOnce();
    expect(result.current.editing).toEqual({
      mode: "create",
      key: 1,
    });
    expect(result.current.submitState).toEqual({
      status: "idle",
    });
  });

  it("회차 생성 API가 실패하면 생성 오류 상태를 설정한다", async () => {
    mockPost.mockResolvedValue({
      response: { ok: false },
    });

    const { result } = renderPerformanceForm({
      defaultCreateOpen: true,
    });

    await act(async () => {
      await result.current.handleSubmit(values);
    });

    expect(result.current.submitState).toEqual({
      status: "error",
      error: "공연 회차 등록에 실패했습니다.",
    });
  });

  it("목록 갱신에 실패해도 생성 성공 상태를 유지한다", async () => {
    mockPost.mockResolvedValue({
      data: { data: performance },
      error: undefined,
      response: { ok: true },
    });

    const { result } = renderPerformanceForm({
      defaultCreateOpen: true,
      onChanged: vi.fn().mockRejectedValue(new Error("refetch failed")),
    });

    await act(async () => {
      await result.current.handleSubmit(values);
    });

    expect(mockToastError).toHaveBeenCalledWith("최신 공연 회차 목록을 불러오지 못했습니다.");
    expect(result.current.submitState).toEqual({
      status: "idle",
    });
  });

  it("기존 회차를 수정하고 편집 상태를 닫는다", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);

    mockPatch.mockResolvedValue({
      data: { data: performance },
      error: undefined,
      response: { ok: true },
    });

    const { result } = renderPerformanceForm({
      onChanged,
    });

    act(() => {
      result.current.handleEdit(performance);
    });

    await act(async () => {
      await result.current.handleSubmit(values);
    });

    expect(mockPatch).toHaveBeenCalledWith("/api/performances/{id}", {
      params: { path: { id: 1 } },
      body: values,
    });
    expect(onChanged).toHaveBeenCalledOnce();
    expect(result.current.editing).toBeNull();
    expect(result.current.submitState).toEqual({
      status: "idle",
    });
  });

  it("회차 수정 API가 실패하면 수정 오류 상태를 설정한다", async () => {
    mockPatch.mockResolvedValue({
      response: { ok: false },
    });

    const { result } = renderPerformanceForm();

    act(() => {
      result.current.handleEdit(performance);
    });

    await act(async () => {
      await result.current.handleSubmit(values);
    });

    expect(result.current.submitState).toEqual({
      status: "error",
      error: "공연 회차 수정에 실패했습니다.",
    });
  });

  it("회차 저장 요청에서 예외가 발생하면 저장 오류 상태를 설정한다", async () => {
    mockPost.mockRejectedValue(new Error("network"));

    const { result } = renderPerformanceForm({
      defaultCreateOpen: true,
    });

    await act(async () => {
      await result.current.handleSubmit(values);
    });

    expect(result.current.submitState).toEqual({
      status: "error",
      error: "공연 회차 저장 중 오류가 발생했습니다.",
    });
  });

  it("삭제를 취소하면 삭제 요청을 보내지 않는다", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    const { result } = renderPerformanceForm();

    await act(async () => {
      await result.current.handleDelete(performance);
    });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("회차를 삭제하고 목록을 갱신한다", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);

    mockDelete.mockResolvedValue({
      error: undefined,
      response: { ok: true },
    });

    const { result } = renderPerformanceForm({
      onChanged,
    });

    await act(async () => {
      await result.current.handleDelete(performance);
    });

    expect(mockDelete).toHaveBeenCalledWith("/api/performances/{id}", {
      params: { path: { id: 1 } },
    });
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("회차 삭제 API가 실패하면 오류 토스트를 표시한다", async () => {
    mockDelete.mockResolvedValue({
      response: { ok: false },
    });

    const { result } = renderPerformanceForm();

    await act(async () => {
      await result.current.handleDelete(performance);
    });

    expect(mockToastError).toHaveBeenCalledWith("공연 회차 삭제에 실패했습니다.");
  });

  it("회차 삭제 요청에서 예외가 발생하면 오류 토스트를 표시한다", async () => {
    mockDelete.mockRejectedValue(new Error("network"));

    const { result } = renderPerformanceForm();

    await act(async () => {
      await result.current.handleDelete(performance);
    });

    expect(mockToastError).toHaveBeenCalledWith("공연 회차 삭제 중 오류가 발생했습니다.");
  });
});
