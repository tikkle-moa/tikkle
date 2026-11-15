import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { useCurrentGroup } from "@entities/group";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
  },
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
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useCurrentGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("회차 ID로 현재 사용자의 그룹을 조회한다", async () => {
    mockGet.mockResolvedValue({ data: { data: membership }, error: undefined, response: { ok: true, status: 200 } });

    const { result } = renderHook(() => useCurrentGroup(5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(membership));
    expect(mockGet).toHaveBeenCalledWith("/api/groups/current", { params: { query: { performanceId: 5 } } });
  });

  it("현재 참여 중인 그룹이 없으면 null을 반환한다", async () => {
    mockGet.mockResolvedValue({ data: { data: null }, error: undefined, response: { ok: true, status: 200 } });

    const { result } = renderHook(() => useCurrentGroup(5), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
