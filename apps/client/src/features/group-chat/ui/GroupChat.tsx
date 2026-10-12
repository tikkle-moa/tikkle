import { ArrowDown, MessageCircle, Send, X } from "lucide-react";

import GroupChatMessage from "./GroupChatMessage";

import { useGroupChat } from "../model/use-group-chat";

interface GroupChatProps {
  groupId: number;
  performanceId: number;
}

const GroupChat = ({ performanceId, groupId }: GroupChatProps) => {
  const {
    userId,
    isOpen,
    isConnected,
    messages,
    content,
    unreadCount,
    messageListRef,
    textareaRef,
    handleSendMessage,
    handleToggleChat,
    handleMessageScroll,
    handleScrollToBottom,
    setContent,
  } = useGroupChat({ groupId, performanceId });

  return (
    <div className="fixed right-4 bottom-20 z-50 flex flex-col items-end gap-3 md:bottom-4">
      {isOpen && (
        <section
          aria-label="그룹 채팅"
          className="flex h-[min(28rem,calc(100dvh-11rem))] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl md:h-[min(28rem,calc(100dvh-7rem))]"
        >
          <header className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">그룹 채팅</h2>
            <p role="status" className="mt-1 text-xs text-gray-500">
              {isConnected ? "같은 그룹의 관객들과 이야기해 보세요" : "채팅에 연결 중이에요…"}
            </p>
          </header>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              ref={messageListRef}
              onScroll={handleMessageScroll}
              role="log"
              aria-label="채팅 메시지"
              aria-live="polite"
              className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4"
            >
              {messages.length === 0 && <p className="py-8 text-center text-sm text-gray-400">첫 메시지를 남겨 보세요!</p>}
              {messages.map((message, index) => (
                <GroupChatMessage key={index} isMine={message.senderId === userId} messageData={message} />
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleScrollToBottom}
                className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-semibold whitespace-nowrap text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none motion-reduce:transition-none"
              >
                <ArrowDown aria-hidden="true" size={16} />새 메시지 {unreadCount}개
              </button>
            )}
          </div>
          <div className="flex items-end gap-2 border-t border-gray-100 p-3">
            <textarea
              ref={textareaRef}
              aria-label="메시지 입력"
              rows={1}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                event.preventDefault();
                handleSendMessage();
              }}
              placeholder="메시지 입력 (Shift+Enter 줄바꿈)"
              className="min-w-0 flex-1 resize-none scrollbar-thin rounded-xl border border-gray-200 px-3 py-2 text-sm leading-5 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:outline-none"
            />
            <button
              type="button"
              aria-label="메시지 전송"
              disabled={!isConnected || !content.trim()}
              className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              onClick={handleSendMessage}
            >
              <Send aria-hidden="true" size={18} />
            </button>
          </div>
        </section>
      )}
      <button
        type="button"
        aria-label={isOpen ? "그룹 채팅 닫기" : `그룹 채팅 열기${unreadCount > 0 ? `, 새 메시지 ${unreadCount}개` : ""}`}
        aria-expanded={isOpen}
        onClick={handleToggleChat}
        className="relative inline-flex size-14 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition duration-200 hover:bg-violet-700 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
      >
        {isOpen ? <X aria-hidden="true" size={24} /> : <MessageCircle aria-hidden="true" size={24} />}
        {!isOpen && unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default GroupChat;
