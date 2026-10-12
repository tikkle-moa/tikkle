import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GroupChatEventData } from "@tikkle/api-types";

import GroupChat from "@features/group-chat/ui/GroupChat";

const chat = vi.hoisted(() => ({
  userId: 1,
  isOpen: true,
  isConnected: true,
  messages: [] as GroupChatEventData[],
  content: "메시지",
  unreadCount: 0,
  messageListRef: { current: null },
  textareaRef: { current: null },
  handleSendMessage: vi.fn(),
  handleToggleChat: vi.fn(),
  handleMessageScroll: vi.fn(),
  handleScrollToBottom: vi.fn(),
  setContent: vi.fn(),
}));

vi.mock("@features/group-chat/model/use-group-chat", () => ({ useGroupChat: () => chat }));

describe("GroupChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.isOpen = true;
    chat.isConnected = true;
    chat.content = "메시지";
    chat.unreadCount = 0;
    chat.messages = [];
  });
  afterEach(cleanup);

  it("입력창은 최대 1,000자로 제한한다", () => {
    render(<GroupChat groupId={1} performanceId={10} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "1000");
  });

  it("수신한 메시지를 내 메시지와 상대 메시지로 구분하고 스크롤을 전달한다", () => {
    const base = { groupId: 1, senderProfileImageUrl: null, sentAt: "2026-10-12T08:00:00Z" };
    chat.messages = [
      { ...base, senderId: 1, senderNickname: "내 이름", content: "내 메시지" },
      { ...base, senderId: 2, senderNickname: "다른 관객", content: "상대 메시지" },
    ];
    render(<GroupChat groupId={1} performanceId={10} />);
    expect(screen.queryByText("첫 메시지를 남겨 보세요!")).not.toBeInTheDocument();
    expect(screen.getByText("나")).toBeInTheDocument();
    expect(screen.getByText("다른 관객")).toBeInTheDocument();
    expect(screen.getByText("내 메시지").closest("[data-other-message]")).toBeNull();
    expect(screen.getByText("상대 메시지").closest("[data-other-message]")).not.toBeNull();
    fireEvent.scroll(screen.getByRole("log"));
    expect(chat.handleMessageScroll).toHaveBeenCalledTimes(1);
  });

  it("닫힌 채팅의 99개 이하 배지는 실제 개수를 표시한다", () => {
    chat.isOpen = false;
    chat.unreadCount = 2;
    render(<GroupChat groupId={1} performanceId={10} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "그룹 채팅 열기, 새 메시지 2개" })).toHaveAttribute("aria-expanded", "false");
  });

  it("Enter는 기본 줄바꿈을 막고 전송한다", () => {
    render(<GroupChat groupId={1} performanceId={10} />);
    const allowed = fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(allowed).toBe(false);
    expect(chat.handleSendMessage).toHaveBeenCalledTimes(1);
  });

  it.each([{ key: "Enter", shiftKey: true }, { key: "Enter", isComposing: true }, { key: "a" }])(
    "Shift+Enter, 한글 조합, 일반 입력은 전송하지 않는다: %j",
    (event) => {
      render(<GroupChat groupId={1} performanceId={10} />);
      const allowed = fireEvent.keyDown(screen.getByRole("textbox"), event);
      expect(allowed).toBe(true);
      expect(chat.handleSendMessage).not.toHaveBeenCalled();
    },
  );

  it("입력 변경과 전송 버튼을 연결한다", () => {
    render(<GroupChat groupId={1} performanceId={10} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "변경한 메시지" } });
    expect(chat.setContent).toHaveBeenCalledWith("변경한 메시지");
    fireEvent.click(screen.getByRole("button", { name: "메시지 전송" }));
    expect(chat.handleSendMessage).toHaveBeenCalledTimes(1);
  });

  it.each(["blank", "disconnected"])("빈 입력 또는 연결 끊김에는 전송을 막는다: %s", (reason) => {
    if (reason === "blank") chat.content = "   ";
    else chat.isConnected = false;
    render(<GroupChat groupId={1} performanceId={10} />);
    const sendButton = screen.getByRole("button", { name: "메시지 전송" });
    expect(sendButton).toBeDisabled();
    fireEvent.click(sendButton);
    expect(chat.handleSendMessage).not.toHaveBeenCalled();
  });

  it("새 메시지 버튼으로 이동하고 개수가 0이면 버튼을 숨긴다", () => {
    chat.unreadCount = 2;
    const { rerender } = render(<GroupChat groupId={1} performanceId={10} />);
    fireEvent.click(screen.getByRole("button", { name: "새 메시지 2개" }));
    expect(chat.handleScrollToBottom).toHaveBeenCalledTimes(1);
    chat.unreadCount = 0;
    rerender(<GroupChat groupId={1} performanceId={10} />);
    expect(screen.queryByRole("button", { name: /새 메시지/ })).not.toBeInTheDocument();
  });

  it("닫힌 채팅에는 개수 배지를 표시하고 99개 초과는 99+로 표시한다", () => {
    chat.isOpen = false;
    chat.unreadCount = 100;
    const { rerender } = render(<GroupChat groupId={1} performanceId={10} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("99+")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "그룹 채팅 열기, 새 메시지 100개" }));
    expect(chat.handleToggleChat).toHaveBeenCalledTimes(1);
    chat.unreadCount = 0;
    rerender(<GroupChat groupId={1} performanceId={10} />);
    expect(screen.queryByText("99+")).not.toBeInTheDocument();
  });
});
