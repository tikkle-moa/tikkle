import { createPerformance, deletePerformance, updatePerformance } from "@features/performance-form/model/performance-form.api";

const { mockDelete, mockPatch, mockPost } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockPatch: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    POST: mockPost,
    PATCH: mockPatch,
    DELETE: mockDelete,
  },
}));

const createRequest = {
  concertId: 7,
  startsAt: "2099-09-01T19:00",
  bookingOpensAt: "2099-08-30T19:00",
};

const updateRequest = {
  startsAt: "2099-09-01T19:00",
  bookingOpensAt: "2099-08-30T19:00",
};

describe("performance-form.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("회차 생성 요청을 전송한다", async () => {
    mockPost.mockResolvedValue({
      data: { data: { id: 1 } },
      error: undefined,
      response: { ok: true },
    });

    await createPerformance(createRequest);

    expect(mockPost).toHaveBeenCalledWith("/api/performances", {
      body: createRequest,
    });
  });

  it("회차 생성 응답이 실패하면 오류를 던진다", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "생성 실패" },
      response: { ok: true },
    });

    await expect(createPerformance(createRequest)).rejects.toThrow("공연 회차 등록에 실패했습니다.");
  });

  it("회차 수정 요청을 전송한다", async () => {
    mockPatch.mockResolvedValue({
      data: { data: { id: 1 } },
      error: undefined,
      response: { ok: true },
    });

    await updatePerformance(1, updateRequest);

    expect(mockPatch).toHaveBeenCalledWith("/api/performances/{id}", {
      params: { path: { id: 1 } },
      body: updateRequest,
    });
  });

  it("회차 수정 응답이 실패하면 오류를 던진다", async () => {
    mockPatch.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { ok: false },
    });

    await expect(updatePerformance(1, updateRequest)).rejects.toThrow("공연 회차 수정에 실패했습니다.");
  });

  it("회차 삭제 요청을 전송한다", async () => {
    mockDelete.mockResolvedValue({
      error: undefined,
      response: { ok: true },
    });

    await deletePerformance(1);

    expect(mockDelete).toHaveBeenCalledWith("/api/performances/{id}", {
      params: { path: { id: 1 } },
    });
  });

  it("삭제 응답에 오류가 있으면 실패로 처리한다", async () => {
    mockDelete.mockResolvedValue({
      error: { message: "삭제 실패" },
      response: { ok: true },
    });

    await expect(deletePerformance(1)).rejects.toThrow("공연 회차 삭제에 실패했습니다.");
  });
});
