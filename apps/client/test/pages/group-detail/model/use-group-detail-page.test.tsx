import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useSessionStore } from "@entities/session";

import { useGroupDetailPage } from "@pages/group-detail/model/use-group-detail-page";

const { mockGet, mockPost, mockDelete, mockToastError, mockToastSuccess, mockUsePerformanceDetail } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
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

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: mockToastSuccess, error: mockToastError }),
}));

const membership = {
  groupId: 21,
  performanceId: 5,
  inviteCode: "abcd2345",
  expiresAt: "2026-12-01T19:00:00",
  leaderUserId: 3,
  members: [
    { userId: 3, nickname: "그룹장", profileImageUrl: null, isLeader: true },
    { userId: 8, nickname: "일행", profileImageUrl: null, isLeader: false },
  ],
};

const success = (data: unknown) => ({ data: { data }, error: undefined, response: { ok: true, status: 200 } });
const failure = (status: number, message = "요청에 실패했습니다.") => ({
  data: undefined,
  error: { error: { code: status, message } },
  response: { ok: false, status },
});

const CurrentLocation = () => {
  const { pathname, search } = useLocation();
  return (
    <output data-testid="current-location">
      {pathname}
      {search}
    </output>
  );
};

const ChangeInviteCode = () => {
  const [, setSearchParams] = useSearchParams();
  return <button onClick={() => setSearchParams({ inviteCode: "efgh2345" })}>다른 초대 코드</button>;
};

const createWrapper = (
  initialEntry = "/groups/21?inviteCode=abcd2345",
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/groups/:groupId"
            element={
              <>
                {children}
                <CurrentLocation />
                <ChangeInviteCode />
              </>
            }
          />
          <Route path="/performances/:performanceId" element={<CurrentLocation />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
};

describe("useGroupDetailPage", () => {
  const mockClipboardWriteText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: mockClipboardWriteText } });
    useSessionStore.setState({
      user: { id: 3, email: "leader@example.com", nickname: "그룹장", profileImageUrl: null, role: "USER", oauthAccounts: ["google"] },
      status: "authenticated",
    });
    mockGet.mockResolvedValue(success(membership));
    mockPost.mockResolvedValue(success(membership));
    mockDelete.mockResolvedValue(success(membership));
    mockUsePerformanceDetail.mockReturnValue({ data: { id: 5, name: "공연 회차" } });
  });

  it("초대 링크에서 그룹 조회가 거부되면 그룹 참여 후 주소의 초대 코드를 지운다", async () => {
    mockGet.mockResolvedValueOnce(failure(403, "활성 그룹 구성원이 아닙니다.")).mockResolvedValue(success(membership));
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.group).toEqual(membership));

    expect(mockGet).toHaveBeenCalledWith("/api/groups/{groupId}", { params: { path: { groupId: 21 } } });
    expect(mockPost).toHaveBeenCalledWith("/api/groups/{groupId}/join", {
      params: { path: { groupId: 21 } },
      body: { inviteCode: "abcd2345" },
    });
    expect(queryClient.getQueryData(["groups", "detail", 21])).toEqual(membership);
    expect(queryClient.getQueryData(["groups", "current", 5])).toEqual(membership);
    expect(screen.getByTestId("current-location")).toHaveTextContent("/groups/21");
    expect(mockToastSuccess).toHaveBeenCalledWith("그룹에 참여했습니다.");
  });

  it("이미 그룹원인 사용자는 초대 코드를 지우고 재참여 요청을 보내지 않는다", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.group).toEqual(membership));
    await waitFor(() => expect(screen.getByTestId("current-location").textContent).toBe("/groups/21"));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("초대 코드가 없는 주소에서는 자동으로 참여하지 않는다", async () => {
    const { wrapper } = createWrapper("/groups/21");
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.group).toEqual(membership));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("잘못된 그룹 ID이면 그룹 조회와 초대 참여를 건너뛴다", async () => {
    const { wrapper } = createWrapper("/groups/invalid?inviteCode=abcd2345");
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.isParamValid).toBe(false));
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it.each([
    ["일반 조회 오류", () => mockGet.mockRejectedValueOnce(new Error("네트워크 오류"))],
    ["초대 코드가 잘못된 그룹 오류", () => mockGet.mockResolvedValueOnce(failure(404, "그룹을 찾을 수 없습니다."))],
  ])("%s이면 초대 자동 참여를 시도하지 않는다", async (_name, arrange) => {
    arrange();
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("참여 요청이 진행 중 다시 403 조회가 발생해도 참여 요청을 중복 전송하지 않는다", async () => {
    mockGet.mockResolvedValueOnce(failure(403)).mockResolvedValueOnce(failure(403));
    let resolveJoin: ((value: unknown) => void) | undefined;
    mockPost.mockImplementation(() => new Promise((resolve) => (resolveJoin = resolve)));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });

    await waitFor(() => expect(mockPost).toHaveBeenCalledOnce());
    await act(async () => result.current.handleRefresh());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "다른 초대 코드" }));
    });
    expect(mockPost).toHaveBeenCalledOnce();

    await act(async () => resolveJoin?.(success(membership)));
  });

  it("참여 API 오류와 네트워크 예외를 구분해 안내한다", async () => {
    mockGet.mockResolvedValueOnce(failure(403));
    mockPost.mockResolvedValueOnce(failure(410, "초대 코드가 만료됐습니다."));
    const first = createWrapper();
    const firstHook = renderHook(() => useGroupDetailPage(), { wrapper: first.wrapper });

    await waitFor(() => expect(firstHook.result.current.errorMessage).toBe("초대 코드가 만료됐습니다."));
    expect(mockToastError).toHaveBeenCalledWith("초대 코드가 만료됐습니다.");
    firstHook.unmount();

    vi.clearAllMocks();
    mockGet.mockResolvedValueOnce(failure(403));
    mockPost.mockRejectedValueOnce("network failure");
    const second = createWrapper();
    renderHook(() => useGroupDetailPage(), { wrapper: second.wrapper });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("그룹에 참여하지 못했습니다."));
  });

  it("그룹장이 확인한 강퇴 요청은 그룹 멤버 API를 호출하고 캐시를 갱신한다", async () => {
    const updatedMembership = { ...membership, members: [membership.members[0]] };
    mockDelete.mockResolvedValueOnce(success(updatedMembership));
    const { wrapper, queryClient } = createWrapper("/groups/21");
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });
    await waitFor(() => expect(result.current.group).toEqual(membership));

    act(() => result.current.handleKickMember(8, "일행"));
    expect(result.current.confirmation).toEqual({ type: "kick", memberUserId: 8, nickname: "일행" });
    act(() => result.current.handleConfirmAction());

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith("/api/groups/{groupId}/members/{memberUserId}", {
        params: { path: { groupId: 21, memberUserId: 8 } },
      }),
    );
    expect(queryClient.getQueryData(["groups", "detail", 21])).toEqual(updatedMembership);
    expect(queryClient.getQueryData(["groups", "current", 5])).toEqual(updatedMembership);
    expect(mockToastSuccess).toHaveBeenCalledWith("그룹원을 내보냈습니다.");
    expect(result.current.confirmation).toBeNull();
  });

  it("그룹장이 아닌 사용자와 본인은 강퇴 대상으로 선택할 수 없다", async () => {
    const { wrapper } = createWrapper("/groups/21");
    const { result, rerender } = renderHook(() => useGroupDetailPage(), { wrapper });
    await waitFor(() => expect(result.current.group).toEqual(membership));

    act(() => result.current.handleKickMember(3, "그룹장"));
    expect(result.current.confirmation).toBeNull();
    act(() => {
      useSessionStore.setState({
        user: { id: 8, email: "member@example.com", nickname: "일행", profileImageUrl: null, role: "USER", oauthAccounts: ["google"] },
        status: "authenticated",
      });
    });
    rerender();
    act(() => result.current.handleKickMember(3, "그룹장"));
    expect(result.current.confirmation).toBeNull();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("강퇴 실패 응답과 네트워크 예외를 각각 안내한다", async () => {
    mockDelete.mockResolvedValueOnce(failure(409, "그룹원을 내보내지 못했습니다: 이미 예매 중입니다."));
    const first = createWrapper("/groups/21");
    const firstHook = renderHook(() => useGroupDetailPage(), { wrapper: first.wrapper });
    await waitFor(() => expect(firstHook.result.current.group).toEqual(membership));
    act(() => firstHook.result.current.handleKickMember(8, "일행"));
    act(() => firstHook.result.current.handleConfirmAction());
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("그룹원을 내보내지 못했습니다: 이미 예매 중입니다."));
    firstHook.unmount();

    vi.clearAllMocks();
    mockGet.mockResolvedValue(success(membership));
    mockDelete.mockRejectedValueOnce("network failure");
    const second = createWrapper("/groups/21");
    const secondHook = renderHook(() => useGroupDetailPage(), { wrapper: second.wrapper });
    await waitFor(() => expect(secondHook.result.current.group).toEqual(membership));
    act(() => secondHook.result.current.handleKickMember(8, "일행"));
    act(() => secondHook.result.current.handleConfirmAction());
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("그룹원을 내보내지 못했습니다."));
  });

  it("탈퇴 확인 전에는 요청하지 않고 확인하면 그룹 캐시를 비우고 회차로 이동한다", async () => {
    const { wrapper, queryClient } = createWrapper("/groups/21");
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });
    await waitFor(() => expect(result.current.group).toEqual(membership));
    queryClient.setQueryData(["groups", "current", 5], membership);

    act(() => result.current.handleConfirmAction());
    expect(mockDelete).not.toHaveBeenCalled();
    act(() => result.current.handleLeaveGroup());
    expect(result.current.confirmation).toEqual({ type: "leave" });
    expect(mockDelete).not.toHaveBeenCalled();
    act(() => result.current.handleDismissConfirmation());
    expect(result.current.confirmation).toBeNull();

    act(() => result.current.handleLeaveGroup());
    act(() => result.current.handleConfirmAction());
    await waitFor(() => expect(screen.getByTestId("current-location")).toHaveTextContent("/performances/5"));
    expect(mockDelete).toHaveBeenCalledWith("/api/groups/{groupId}/leave", { params: { path: { groupId: 21 } } });
    expect(queryClient.getQueryData(["groups", "current", 5])).toBeNull();
    expect(queryClient.getQueryData(["groups", "detail", 21])).toBeUndefined();
    expect(mockToastSuccess).toHaveBeenCalledWith("그룹에서 나왔습니다.");
  });

  it("탈퇴 실패 응답과 네트워크 예외를 각각 안내한다", async () => {
    mockDelete.mockResolvedValueOnce(failure(409, "그룹에서 나갈 수 없습니다."));
    const first = createWrapper("/groups/21");
    const firstHook = renderHook(() => useGroupDetailPage(), { wrapper: first.wrapper });
    await waitFor(() => expect(firstHook.result.current.group).toEqual(membership));
    act(() => firstHook.result.current.handleLeaveGroup());
    act(() => firstHook.result.current.handleConfirmAction());
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("그룹에서 나갈 수 없습니다."));
    firstHook.unmount();

    vi.clearAllMocks();
    mockGet.mockResolvedValue(success(membership));
    mockDelete.mockRejectedValueOnce("network failure");
    const second = createWrapper("/groups/21");
    const secondHook = renderHook(() => useGroupDetailPage(), { wrapper: second.wrapper });
    await waitFor(() => expect(secondHook.result.current.group).toEqual(membership));
    act(() => secondHook.result.current.handleLeaveGroup());
    act(() => secondHook.result.current.handleConfirmAction());
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("그룹에서 나가지 못했습니다."));
  });

  it("초대 링크와 코드를 클립보드에 복사하고 복사 실패를 안내한다", async () => {
    const { wrapper } = createWrapper("/groups/21");
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });
    await waitFor(() => expect(result.current.group).toEqual(membership));

    await act(async () => {
      await result.current.handleCopyInviteLink();
      await result.current.handleCopyInviteCode();
    });
    expect(mockClipboardWriteText).toHaveBeenNthCalledWith(1, `${window.location.origin}/groups/21?inviteCode=abcd2345`);
    expect(mockClipboardWriteText).toHaveBeenNthCalledWith(2, "ABCD2345");
    expect(mockToastSuccess).toHaveBeenCalledWith("초대 링크를 복사했습니다.");
    expect(mockToastSuccess).toHaveBeenCalledWith("초대 코드를 복사했습니다.");

    mockClipboardWriteText.mockRejectedValue(new Error("clipboard denied"));
    await act(async () => {
      await result.current.handleCopyInviteLink();
      await result.current.handleCopyInviteCode();
    });
    expect(mockToastError).toHaveBeenCalledWith("링크를 복사하지 못했습니다. 입력란에서 직접 복사해 주세요.");
    expect(mockToastError).toHaveBeenCalledWith("초대 코드를 복사하지 못했습니다.");
  });

  it("그룹 데이터가 없으면 초대 코드 복사는 건너뛰고 빈 초대 링크도 복사할 수 있다", async () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { wrapper } = createWrapper("/groups/21");
    const { result } = renderHook(() => useGroupDetailPage(), { wrapper });

    act(() => result.current.handleKickMember(8, "일행"));
    expect(result.current.confirmation).toBeNull();
    await act(async () => {
      await result.current.handleCopyInviteCode();
      await result.current.handleCopyInviteLink();
    });
    expect(mockClipboardWriteText).toHaveBeenCalledOnce();
    expect(mockClipboardWriteText).toHaveBeenCalledWith("");
  });
});
