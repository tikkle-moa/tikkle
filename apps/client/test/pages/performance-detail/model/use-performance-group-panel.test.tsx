import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { usePerformanceGroupPanel } from "@pages/performance-detail/model/use-performance-group-panel";

const { mockGet, mockPost, mockToastError } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
    POST: mockPost,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: mockToastError }),
}));

const membership = {
  groupId: 21,
  performanceId: 5,
  inviteCode: "abcd2345",
  expiresAt: "2026-12-01T19:00:00",
  leaderUserId: 3,
  members: [{ userId: 3, nickname: "그룹장", profileImageUrl: null, isLeader: true }],
};

const success = (data: unknown) => ({ data: { data }, error: undefined, response: { ok: true, status: 200 } });
const failure = (status: number, message: string) => ({
  data: undefined,
  error: { error: { code: status, message } },
  response: { ok: false, status },
});

const GroupPanelProbe = () => {
  const { group, handleCreateGroup, inviteCode, handleInviteCodeChange, handleJoinGroup, handleOpenGroup, handleRefresh } = usePerformanceGroupPanel({
    performanceId: 5,
  });
  return (
    <>
      <input aria-label="초대 코드 입력" onChange={(event) => handleInviteCodeChange(event.target.value)} value={inviteCode} />
      <button onClick={handleCreateGroup}>그룹 생성 요청</button>
      <button onClick={handleJoinGroup}>초대 코드 참여 요청</button>
      <button onClick={handleOpenGroup}>기존 그룹 열기</button>
      <button onClick={handleRefresh}>그룹 새로고침</button>
      <output data-testid="group-id">{group?.groupId ?? "없음"}</output>
    </>
  );
};

const CurrentPath = () => {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
};

const renderHookPage = (queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const rendered = render(
    <Wrapper>
      <MemoryRouter initialEntries={["/performances/5"]}>
        <Routes>
          <Route
            path="/performances/:performanceId"
            element={
              <>
                <GroupPanelProbe />
                <CurrentPath />
              </>
            }
          />
          <Route path="/groups/:groupId" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
  return { queryClient, ...rendered };
};

describe("usePerformanceGroupPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(success(null));
    mockPost.mockResolvedValue(success(membership));
  });

  it("그룹 생성 성공 후 관리 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderHookPage();

    await user.click(screen.getByRole("button", { name: "그룹 생성 요청" }));

    expect(await screen.findByTestId("current-path")).toHaveTextContent("/groups/21");
    expect(mockPost).toHaveBeenCalledWith("/api/groups", { body: { performanceId: 5 } });
  });

  it("초대 코드 참여 성공 후 그룹 관리 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    renderHookPage();

    await user.type(screen.getByRole("textbox", { name: "초대 코드 입력" }), " abcd2345 ");
    await user.click(screen.getByRole("button", { name: "초대 코드 참여 요청" }));

    expect(await screen.findByTestId("current-path")).toHaveTextContent("/groups/21");
    expect(mockPost).toHaveBeenCalledWith("/api/groups/join", { body: { inviteCode: "abcd2345" } });
  });
  it("다른 회차 그룹에 참여하면 응답 회차의 캐시만 갱신한다", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockPost.mockResolvedValue({ data: { data: { ...membership, performanceId: 9 } }, response: { ok: true, status: 200 } });
    renderHookPage(queryClient);
    await user.type(screen.getByRole("textbox", { name: "초대 코드 입력" }), "abcd2345");
    await user.click(screen.getByRole("button", { name: "초대 코드 참여 요청" }));
    await screen.findByText("/groups/21");
    expect(queryClient.getQueryData(["groups", "current", 9])).toEqual({ ...membership, performanceId: 9 });
    expect(queryClient.getQueryData(["groups", "current", 5])).toBeNull();
  });

  it("그룹 생성 API 오류와 네트워크 예외를 각각 안내한다", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce(failure(409, "이미 그룹에 참여하고 있습니다."));
    renderHookPage();
    await user.click(screen.getByRole("button", { name: "그룹 생성 요청" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("이미 그룹에 참여하고 있습니다."));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/performances/5");

    mockPost.mockRejectedValueOnce("network failure");
    await user.click(screen.getByRole("button", { name: "그룹 생성 요청" }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("그룹을 만들지 못했습니다."));
  });

  it("초대 코드 참여 API 오류와 네트워크 예외를 각각 안내한다", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValueOnce(failure(404, "초대 코드를 찾을 수 없습니다."));
    renderHookPage();
    await user.type(screen.getByRole("textbox", { name: "초대 코드 입력" }), "abcd2345");
    await user.click(screen.getByRole("button", { name: "초대 코드 참여 요청" }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("초대 코드를 찾을 수 없습니다."));

    mockPost.mockRejectedValueOnce("network failure");
    await user.click(screen.getByRole("button", { name: "초대 코드 참여 요청" }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("그룹에 참여하지 못했습니다."));
  });

  it("활성 그룹 조회 결과가 있으면 캐시한 뒤 관리 화면으로 이동하고 새로고침한다", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue(success(membership));
    const { queryClient } = renderHookPage();

    await waitFor(() => expect(screen.getByTestId("group-id")).toHaveTextContent("21"));
    await user.click(screen.getByRole("button", { name: "그룹 새로고침" }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole("button", { name: "기존 그룹 열기" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/groups/21");
    expect(queryClient.getQueryData(["groups", "detail", 21])).toEqual(membership);
  });

  it("그룹 데이터가 없는 동안 관리 화면 열기는 건너뛰고 새로고침은 조회를 다시 요청한다", async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(() => new Promise(() => {}));
    renderHookPage();

    await user.click(screen.getByRole("button", { name: "기존 그룹 열기" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/performances/5");
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledOnce();
  });
});
