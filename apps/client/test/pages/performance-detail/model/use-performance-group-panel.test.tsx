import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { usePerformanceGroupPanel } from "@pages/performance-detail/model/use-performance-group-panel";

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
    POST: mockPost,
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

const GroupPanelProbe = () => {
  const { handleCreateGroup, inviteCode, handleInviteCodeChange, handleJoinGroup } = usePerformanceGroupPanel({ performanceId: 5 });
  return (
    <>
      <input aria-label="초대 코드 입력" onChange={(event) => handleInviteCodeChange(event.target.value)} value={inviteCode} />
      <button onClick={handleCreateGroup}>그룹 생성 요청</button>
      <button onClick={handleJoinGroup}>초대 코드 참여 요청</button>
    </>
  );
};

const CurrentPath = () => {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
};

const renderHookPage = (queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  return render(
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
};

describe("usePerformanceGroupPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { data: null }, error: undefined, response: { ok: true, status: 200 } });
    mockPost.mockResolvedValue({ data: { data: membership }, error: undefined, response: { ok: true, status: 201 } });
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

    await user.type(screen.getByRole("textbox", { name: "초대 코드 입력" }), "abcd2345");
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
});
