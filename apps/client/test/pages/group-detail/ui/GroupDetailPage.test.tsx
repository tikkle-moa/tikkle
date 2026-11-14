import { MemoryRouter } from "react-router";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import GroupDetailPage from "@pages/group-detail/ui/GroupDetailPage";

const { mockUseGroupDetailPage, mockCopyInviteLink, mockCopyInviteCode, mockKickMember, mockLeaveGroup } = vi.hoisted(() => ({
  mockUseGroupDetailPage: vi.fn(),
  mockCopyInviteLink: vi.fn(),
  mockCopyInviteCode: vi.fn(),
  mockKickMember: vi.fn(),
  mockLeaveGroup: vi.fn(),
}));

vi.mock("@pages/group-detail/model/use-group-detail-page", () => ({
  useGroupDetailPage: mockUseGroupDetailPage,
}));

const pageState = {
  currentUser: { id: 3, nickname: "그룹장", profileImageUrl: null },
  group: {
    groupId: 21,
    performanceId: 5,
    inviteCode: "abcd2345",
    expiresAt: "2026-12-01T19:00:00",
    leaderUserId: 3,
    members: [
      { userId: 3, nickname: "그룹장", profileImageUrl: null, isLeader: true },
      { userId: 8, nickname: "일행", profileImageUrl: null, isLeader: false },
    ],
  },
  performance: { id: 5, name: "Tikkle Live" },
  isParamValid: true,
  isPending: false,
  errorMessage: undefined,
  isLeader: true,
  isKicking: false,
  isLeaving: false,
  handleCopyInviteLink: mockCopyInviteLink,
  handleCopyInviteCode: mockCopyInviteCode,
  handleKickMember: mockKickMember,
  handleLeaveGroup: mockLeaveGroup,
  handleRefresh: vi.fn(),
};

describe("GroupDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGroupDetailPage.mockReturnValue(pageState);
  });

  it("그룹원, 강조된 초대 코드, 좌석 이동을 표시한다", () => {
    render(
      <MemoryRouter>
        <GroupDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "함께 예매할 그룹" })).toBeInTheDocument();
    expect(screen.getByText("Tikkle Live")).toBeInTheDocument();
    expect(screen.getByText("그룹원").closest("section")).toHaveTextContent("2 / 4명");
    expect(screen.getAllByText("그룹장").length).toBeGreaterThan(0);
    expect(screen.getByText("ABCD2345")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "초대 링크" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "초대 링크 공유" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "좌석 선택으로 이동" })).toHaveAttribute("href", "/performances/5");
  });

  it("초대 코드와 링크 복사, 그룹원 내보내기, 탈퇴 요청을 연결한다", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <GroupDetailPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "코드 복사" }));
    await user.click(screen.getByRole("button", { name: "초대 링크 공유" }));
    await user.click(screen.getByRole("button", { name: "일행 내보내기" }));
    await user.click(screen.getByRole("button", { name: "그룹 나가기" }));

    expect(mockCopyInviteLink).toHaveBeenCalledOnce();
    expect(mockCopyInviteCode).toHaveBeenCalledOnce();
    expect(mockKickMember).toHaveBeenCalledWith(8, "일행");
    expect(mockLeaveGroup).toHaveBeenCalledOnce();
  });
  it("공통 탈퇴 확인창의 취소와 확인 동작을 연결한다", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    mockUseGroupDetailPage.mockReturnValue({
      ...pageState,
      confirmation: { type: "leave" },
      handleConfirmAction: onConfirm,
      handleDismissConfirmation: onCancel,
    });
    render(
      <MemoryRouter>
        <GroupDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("dialog", { name: "그룹에서 나갈까요?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledOnce();
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "그룹 나가기" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
  it("재조회 권한 오류가 나면 캐시된 그룹 관리 화면을 숨긴다", () => {
    mockUseGroupDetailPage.mockReturnValue({ ...pageState, isError: true, errorMessage: "활성 그룹 구성원이 아닙니다." });
    render(
      <MemoryRouter>
        <GroupDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("활성 그룹 구성원이 아닙니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "그룹 나가기" })).not.toBeInTheDocument();
  });
});
