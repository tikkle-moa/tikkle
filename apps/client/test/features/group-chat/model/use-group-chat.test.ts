import { act, renderHook } from "@testing-library/react";
import type { GroupChatEventData } from "@tikkle/api-types";

import { useGroupChat } from "@features/group-chat/model/use-group-chat";

const mocks = vi.hoisted(() => ({
  subscribeEvent: vi.fn(),
  subscribeError: vi.fn(),
  unsubscribeError: vi.fn(),
  toastError: vi.fn(),
  publish: vi.fn(),
  getStompClient: vi.fn(),
  unsubscribe: vi.fn(),
  connected: true,
  hasClient: true,
}));

vi.mock("@shared/realtime/stomp.store", () => ({
  useStompStore: (selector: (state: unknown) => unknown) =>
    selector({
      stompClient: mocks.hasClient ? mocks : null,
      connectionStatus: mocks.connected ? "connected" : "disconnected",
      getStompClient: mocks.getStompClient,
    }),
}));
vi.mock("react-hot-toast", () => ({ default: { error: mocks.toastError } }));

vi.mock("@entities/session", () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ user: { id: 1 } }),
}));

const message: GroupChatEventData = {
  senderId: 2,
  senderNickname: "관객",
  senderProfileImageUrl: null,
  content: "안녕하세요",
  groupId: 1,
  sentAt: "2026-10-12T08:00:00Z",
};

// jsdom에는 레이아웃 계산이 없어 메시지 높이와 스크롤 경계를 지정한다.
const createList = () => {
  const list = document.createElement("div");
  Object.defineProperties(list, { clientHeight: { value: 200 }, scrollHeight: { value: 600 } });
  for (const bottom of [300, 450, 600]) {
    const item = document.createElement("div");
    item.setAttribute("data-other-message", "");
    item.getBoundingClientRect = () => ({ bottom: bottom - list.scrollTop }) as DOMRect;
    list.append(item);
  }
  return list;
};

describe("useGroupChat", () => {
  let receive: (event: { data: GroupChatEventData }) => void;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connected = true;
    mocks.hasClient = true;
    mocks.subscribeError.mockReturnValue({ unsubscribe: mocks.unsubscribeError });
    mocks.subscribeEvent.mockImplementation(({ callback }) => {
      receive = callback;
      return { unsubscribe: mocks.unsubscribe };
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("1,001자는 전송하지 않고 초안을 보존한다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    const draft = "가".repeat(1001);
    act(() => result.current.setContent(draft));
    act(() => result.current.handleSendMessage());
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(result.current.content).toBe(draft);
  });

  it("정확히 1,000자인 메시지는 전송하고 입력을 비운다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    const content = "가".repeat(1000);
    act(() => result.current.setContent(content));
    act(() => result.current.handleSendMessage());
    expect(mocks.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        command: { requestId: expect.any(String), data: { content, performanceId: 10 } },
      }),
    );
    expect(result.current.content).toBe("");
  });

  it.each([
    { groupId: 2, performanceId: 10 },
    { groupId: 1, performanceId: 20 },
  ])("방이 바뀌면 메시지, 초안, 알림, 열림 및 스크롤 위치를 초기화한다: %j", (nextRoom) => {
    const { result, rerender } = renderHook((props) => useGroupChat(props), {
      initialProps: { groupId: 1, performanceId: 10 },
    });
    const list = createList();
    Object.assign(result.current.messageListRef, { current: list });
    act(() => result.current.handleToggleChat());
    list.scrollTop = 100;
    act(() => result.current.handleMessageScroll());
    act(() => result.current.setContent("이전 방 초안"));
    act(() => receive({ data: message }));
    expect(result.current.unreadCount).toBe(1);
    rerender(nextRoom);
    expect(result.current.messages).toEqual([]);
    expect(result.current.content).toBe("");
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.handleToggleChat());
    expect(list.scrollTop).toBe(0);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.unsubscribeError).toHaveBeenCalledTimes(1);
    expect(mocks.subscribeEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pathParams: { groupId: nextRoom.groupId },
        headerParams: { performanceId: nextRoom.performanceId },
      }),
    );
  });

  it("입력창은 한 줄에서 늘어나고 세 줄을 넘으면 스크롤되며 지우면 줄어든다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    const textarea = document.createElement("textarea");
    textarea.style.cssText = "line-height:20px;padding:8px;border:1px solid;";
    let scrollHeight = 36;
    Object.defineProperty(textarea, "scrollHeight", { get: () => scrollHeight });
    Object.assign(result.current.textareaRef, { current: textarea });
    act(() => result.current.handleToggleChat());
    expect(textarea.style.height).toBe("38px");
    expect(textarea.style.overflowY).toBe("hidden");
    scrollHeight = 56;
    act(() => result.current.setContent("첫 줄\n둘째 줄"));
    expect(textarea.style.height).toBe("58px");
    expect(textarea.style.overflowY).toBe("hidden");
    scrollHeight = 116;
    act(() => result.current.setContent("첫 줄\n둘째 줄\n셋째 줄\n넷째 줄"));
    expect(textarea.style.height).toBe("78px");
    expect(textarea.style.overflowY).toBe("auto");
    scrollHeight = 36;
    act(() => result.current.setContent(""));
    expect(textarea.style.height).toBe("38px");
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("메시지 목록이 없으면 스크롤 핸들러는 안전하게 종료한다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    expect(() => result.current.handleMessageScroll()).not.toThrow();
    expect(() => result.current.handleScrollToBottom()).not.toThrow();
    act(() => result.current.handleToggleChat());
    act(() => result.current.handleToggleChat());
    expect(result.current.isOpen).toBe(false);
  });

  it("클라이언트가 없으면 연결 상태와 무관하게 전송하거나 구독하지 않는다", () => {
    mocks.hasClient = false;
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    act(() => result.current.setContent("보낼 메시지"));
    act(() => result.current.handleSendMessage());
    expect(mocks.subscribeEvent).not.toHaveBeenCalled();
    expect(mocks.subscribeError).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(result.current.content).toBe("보낼 메시지");
  });

  it("공연 헤더로 구독하고 경로 변경 및 언마운트 시 구독을 해제한다", () => {
    const { rerender, unmount } = renderHook((props) => useGroupChat(props), {
      initialProps: { groupId: 1, performanceId: 10 },
    });
    expect(mocks.subscribeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/groups/{groupId}/chat",
        pathParams: { groupId: 1 },
        headerParams: { performanceId: 10 },
      }),
    );
    rerender({ groupId: 2, performanceId: 10 });
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.unsubscribeError).toHaveBeenCalledTimes(1);
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(2);
    expect(mocks.unsubscribeError).toHaveBeenCalledTimes(2);
  });

  it("개인 채팅 오류 큐를 구독하고 전송 오류를 알린다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    expect(mocks.subscribeError).toHaveBeenCalledWith({ path: "/groups/chat", errorCallback: expect.any(Function) });
    const { errorCallback } = mocks.subscribeError.mock.calls[0][0];
    act(() => errorCallback({ requestId: "request", success: false, error: { code: "ACCESS_DENIED", message: "채팅 전송 권한이 없습니다." } }));
    expect(mocks.toastError).toHaveBeenCalledWith("채팅 전송 권한이 없습니다.");
    expect(result.current.messages).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("닫힌 상태에서는 상대 메시지만 읽지 않은 개수에 포함한다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    act(() => {
      receive({ data: message });
      receive({ data: message });
      receive({ data: { ...message, senderId: 1 } });
    });
    expect(result.current.unreadCount).toBe(2);
    expect(result.current.messages).toHaveLength(3);
  });

  it("화면 아래 남은 개수대로 순차 감소하고 위로 올라가도 증가하지 않는다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    act(() => {
      receive({ data: message });
      receive({ data: message });
      receive({ data: message });
    });
    const list = createList();
    Object.assign(result.current.messageListRef, { current: list });
    act(() => result.current.handleToggleChat());
    expect(result.current.unreadCount).toBe(3);
    for (const [scrollTop, unread] of [
      [100, 2],
      [250, 1],
      [0, 1],
      [400, 0],
    ]) {
      list.scrollTop = scrollTop;
      act(() => result.current.handleMessageScroll());
      expect(result.current.unreadCount).toBe(unread);
    }
  });

  it("다시 열면 이전 위치와 화면 아래 남은 알림을 유지한다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    const list = createList();
    Object.assign(result.current.messageListRef, { current: list });
    act(() => result.current.handleToggleChat());
    list.scrollTop = 150;
    act(() => result.current.handleMessageScroll());
    act(() => result.current.handleToggleChat());
    act(() => receive({ data: message }));
    list.scrollTop = 0;
    act(() => result.current.handleToggleChat());
    expect(list.scrollTop).toBe(150);
    expect(result.current.unreadCount).toBe(1);
  });

  it("상대 메시지는 위쪽에서 위치를 유지하고 내 메시지는 아래로 이동한다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    const list = createList();
    Object.assign(result.current.messageListRef, { current: list });
    act(() => result.current.handleToggleChat());
    list.scrollTop = 100;
    act(() => result.current.handleMessageScroll());
    act(() => receive({ data: message }));
    expect(list.scrollTop).toBe(100);
    expect(result.current.unreadCount).toBe(1);
    act(() => receive({ data: { ...message, senderId: 1 } }));
    expect(list.scrollTop).toBe(600);
    expect(result.current.unreadCount).toBe(0);
  });

  it("맨 아래에서 상대 메시지가 도착하면 자동 이동한다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    const list = createList();
    Object.assign(result.current.messageListRef, { current: list });
    act(() => result.current.handleToggleChat());
    list.scrollTop = 400;
    act(() => result.current.handleMessageScroll());
    act(() => receive({ data: message }));
    expect(list.scrollTop).toBe(600);
    expect(result.current.unreadCount).toBe(0);
  });

  it.each([false, true])("이동 버튼은 모션 감소 설정(%s)을 따른다", (reducedMotion) => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    const list = createList();
    list.scrollTo = vi.fn();
    Object.assign(result.current.messageListRef, { current: list });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: reducedMotion })),
    );
    result.current.handleScrollToBottom();
    expect(list.scrollTo).toHaveBeenCalledWith({ top: 600, behavior: reducedMotion ? "auto" : "smooth" });
  });

  it("공백 메시지는 보내지 않고 정상 메시지는 전송 후 입력을 비운다", () => {
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    act(() => result.current.setContent("   "));
    act(() => result.current.handleSendMessage());
    expect(mocks.publish).not.toHaveBeenCalled();
    act(() => result.current.setContent("  첫 줄\n다음 줄  "));
    act(() => result.current.handleSendMessage());
    expect(mocks.publish).toHaveBeenCalledWith({
      path: "/groups/chat",
      command: {
        requestId: expect.any(String),
        data: { content: "첫 줄\n다음 줄", performanceId: 10 },
      },
    });
    expect(result.current.content).toBe("");
  });

  it("연결되지 않으면 구독하거나 전송하지 않고 입력을 보존한다", () => {
    mocks.connected = false;
    const { result } = renderHook(() => useGroupChat({ groupId: 1, performanceId: 10 }));
    act(() => result.current.setContent("메시지"));
    act(() => result.current.handleSendMessage());
    expect(mocks.getStompClient).toHaveBeenCalled();
    expect(mocks.subscribeEvent).not.toHaveBeenCalled();
    expect(mocks.subscribeError).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(result.current.content).toBe("메시지");
  });
});
