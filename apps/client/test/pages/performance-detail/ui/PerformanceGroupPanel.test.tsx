import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
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

    await user.click(screen.getByRole("button", { name: "그룹 만들기" }));
    await user.click(screen.getByRole("button", { name: "코드로 참여" }));

    expect(mockCreateGroup).toHaveBeenCalledOnce();
    expect(mockJoinGroup).toHaveBeenCalledOnce();
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
});
