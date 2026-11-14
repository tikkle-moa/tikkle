import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useSessionStore } from "@entities/session";

import { useGroupDetailPage } from "@pages/group-detail/model/use-group-detail-page";

const { mockGet, mockPost, mockDelete, mockUsePerformanceDetail } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
  mockUsePerformanceDetail: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
    POST: mockPost,
    DELETE: mockDelete,
  },
}));

vi.mock("@entities/performance", () => ({
  usePerformanceDetail: mockUsePerformanceDetail,
}));

const membership = {
  groupId: 21,
  performanceId: 5,
  inviteCode: "abcd2345",
  expiresAt: "2026-12-01T19:00:00",
  leaderUserId: 3,
  members: [{ userId: 3, nickname: "그룹장", profileImageUrl: null, isLeader: true }],
};

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/groups/21?inviteCode=abcd2345"]}>
        <Routes>
          <Route path="/groups/:groupId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("useGroupDetailPage invitation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({
      user: { id: 8, email: "guest@example.com", nickname: "초대받은 사람", profileImageUrl: null, role: "USER", oauthAccounts: ["google"] },
      status: "authenticated",
    });
    mockGet
      .mockResolvedValueOnce({
        data: undefined,
        error: { error: { code: 403, message: "활성 그룹 구성원이 아닙니다." } },
        response: { ok: false, status: 403 },
      })
      .mockResolvedValue({ data: { data: membership }, error: undefined, response: { ok: true, status: 200 } });
    mockPost.mockResolvedValue({ data: { data: membership }, error: undefined, response: { ok: true, status: 200 } });
    mockUsePerformanceDetail.mockReturnValue({ data: { id: 5, name: "공연 회차" } });
  });

  it("초대 링크에서 먼저 그룹 조회 후 비멤버를 참여시킨다", async () => {
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.group).toEqual(membership));

    expect(mockGet).toHaveBeenCalledWith("/api/groups/{groupId}", { params: { path: { groupId: 21 } } });
    expect(mockPost).toHaveBeenCalledWith("/api/groups/{groupId}/join", {
      params: { path: { groupId: 21 } },
      body: { inviteCode: "abcd2345" },
    });
  });
  it("탈퇴 확인창을 취소하면 요청하지 않고 확인할 때만 탈퇴한다", async () => {
    mockGet.mockReset().mockResolvedValue({ data: { data: membership }, response: { ok: true, status: 200 } });
    mockDelete.mockRejectedValue(new Error("테스트 요청 실패"));
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.group).toEqual(membership));

    act(() => result.current.handleLeaveGroup());
    expect(result.current.confirmation).toEqual({ type: "leave" });
    expect(mockDelete).not.toHaveBeenCalled();
    act(() => result.current.handleDismissConfirmation());
    expect(result.current.confirmation).toBeNull();
    expect(mockDelete).not.toHaveBeenCalled();

    act(() => result.current.handleLeaveGroup());
    act(() => result.current.handleConfirmAction());
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("/api/groups/{groupId}/leave", { params: { path: { groupId: 21 } } }));
  });
});
