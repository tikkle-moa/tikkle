import { MemoryRouter } from "react-router";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PerformanceGroupPanel from "@pages/performance-detail/ui/PerformanceGroupPanel";

const { mockUsePerformanceGroupPanel, mockCreateGroup, mockJoinGroup, mockOpenGroup, mockInviteCodeChange } = vi.hoisted(() => ({
  mockUsePerformanceGroupPanel: vi.fn(),
  mockCreateGroup: vi.fn(),
  mockJoinGroup: vi.fn(),
  mockOpenGroup: vi.fn(),
  mockInviteCodeChange: vi.fn(),
}));

vi.mock("@pages/performance-detail/model/use-performance-group-panel", () => ({
  usePerformanceGroupPanel: mockUsePerformanceGroupPanel,
}));

describe("PerformanceGroupPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("현재 그룹이 없으면 그룹 생성을 제공한다", async () => {
    const user = userEvent.setup();
    mockUsePerformanceGroupPanel.mockReturnValue({
      group: null,
      isLoading: false,
      isError: false,
      isCreating: false,
      isJoining: false,
      inviteCode: "abcd2345",
      handleInviteCodeChange: mockInviteCodeChange,
      handleCreateGroup: mockCreateGroup,
      handleJoinGroup: mockJoinGroup,
      handleOpenGroup: mockOpenGroup,
      handleRefresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PerformanceGroupPanel performanceId={5} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "초대 코드 입력" }), { target: { value: "efgh2345" } });
    await user.click(screen.getByRole("button", { name: "그룹 만들기" }));
    await user.click(screen.getByRole("button", { name: "코드로 참여" }));

    expect(mockCreateGroup).toHaveBeenCalledOnce();
    expect(mockJoinGroup).toHaveBeenCalledOnce();
    expect(mockInviteCodeChange).toHaveBeenCalled();
  });

  it("기존 그룹이 있으면 관리 화면을 연다", async () => {
    const user = userEvent.setup();
    mockUsePerformanceGroupPanel.mockReturnValue({
      group: {
        groupId: 21,
        members: [
          { userId: 3, nickname: "그룹장", isLeader: true },
          { userId: 8, nickname: "일행" },
        ],
      },
      isLoading: false,
      isError: false,
      isCreating: false,
      isJoining: false,
      inviteCode: "",
      handleInviteCodeChange: mockInviteCodeChange,
      handleCreateGroup: mockCreateGroup,
      handleJoinGroup: mockJoinGroup,
      handleOpenGroup: mockOpenGroup,
      handleRefresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PerformanceGroupPanel performanceId={5} />
      </MemoryRouter>,
    );

    expect(screen.getByText("그룹원 2 / 4명")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "그룹 관리" }));

    expect(mockOpenGroup).toHaveBeenCalledOnce();
    expect(screen.getByText("일행")).toBeInTheDocument();
    const summary = screen.getByText("그룹 예매").closest("summary")!;
    await user.click(summary);
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });

  it("그룹 조회 중에는 로딩 상태와 진행 중인 생성·참여 상태를 표시한다", () => {
    mockUsePerformanceGroupPanel.mockReturnValue({
      group: null,
      isLoading: true,
      isError: false,
      isCreating: true,
      isJoining: false,
      inviteCode: "",
      handleInviteCodeChange: mockInviteCodeChange,
      handleCreateGroup: mockCreateGroup,
      handleJoinGroup: mockJoinGroup,
      handleOpenGroup: mockOpenGroup,
      handleRefresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PerformanceGroupPanel performanceId={5} />
      </MemoryRouter>,
    );

    expect(screen.getByText("참여 중인 그룹을 확인하고 있어요…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "그룹 만드는 중…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "초대 코드 입력" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "코드로 참여" })).toBeDisabled();
  });

  it("그룹 조회 오류에는 재시도만 제공하고 새로고침을 연결한다", async () => {
    const user = userEvent.setup();
    const handleRefresh = vi.fn();
    mockUsePerformanceGroupPanel.mockReturnValue({
      group: null,
      isLoading: false,
      isError: true,
      isCreating: false,
      isJoining: false,
      inviteCode: "",
      handleInviteCodeChange: mockInviteCodeChange,
      handleCreateGroup: mockCreateGroup,
      handleJoinGroup: mockJoinGroup,
      handleOpenGroup: mockOpenGroup,
      handleRefresh,
    });

    render(
      <MemoryRouter>
        <PerformanceGroupPanel performanceId={5} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("그룹 정보를 불러오지 못했습니다.");
    expect(screen.queryByRole("button", { name: "그룹 만들기" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(handleRefresh).toHaveBeenCalledOnce();
  });

  it("그룹 참여 중에는 버튼 문구를 바꾸고 입력을 비활성화한다", () => {
    mockUsePerformanceGroupPanel.mockReturnValue({
      group: null,
      isLoading: false,
      isError: false,
      isCreating: false,
      isJoining: true,
      inviteCode: "abcd2345",
      handleInviteCodeChange: mockInviteCodeChange,
      handleCreateGroup: mockCreateGroup,
      handleJoinGroup: mockJoinGroup,
      handleOpenGroup: mockOpenGroup,
      handleRefresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PerformanceGroupPanel performanceId={5} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "참여 중…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "초대 코드 입력" })).toBeDisabled();
  });
});
