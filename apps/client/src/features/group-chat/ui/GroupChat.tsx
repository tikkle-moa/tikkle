import { ArrowDown, MessageCircle, Send, X } from "lucide-react";

import GroupChatMessage from "./GroupChatMessage";

import { MAX_CHAT_MESSAGE_LENGTH } from "../model/group-chat.constants";
import { getMessageLengthClass } from "../model/group-chat.utils";
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
          className="flex h-[min(30rem,calc(100dvh-11rem))] w-88 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-violet-100/80 bg-white shadow-[0_16px_64px_-16px_rgba(46,16,101,0.25)] md:h-[min(30rem,calc(100dvh-7rem))]"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-violet-100/60 bg-linear-to-r from-violet-50 to-white px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
              <MessageCircle aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight text-gray-900">그룹 채팅</h2>
              <p role="status" className="mt-1 flex items-center gap-1.5 text-[11px] leading-relaxed text-gray-500">
                <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
                {isConnected ? "같은 그룹의 관객들과 이야기해 보세요" : "채팅에 연결 중이에요…"}
              </p>
            </div>
          </header>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              ref={messageListRef}
              onScroll={handleMessageScroll}
              role="log"
              aria-label="채팅 메시지"
              aria-live="polite"
              className="scrollbar-hide min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#f8f7fc] px-4 py-5"
            >
              {messages.length === 0 && (
                <div className="flex min-h-full flex-col items-center justify-center gap-3 py-8">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-violet-300 shadow-sm ring-1 ring-violet-100/60">
                    <MessageCircle aria-hidden="true" size={26} strokeWidth={1.5} />
                  </span>
                  <p className="text-center text-sm text-gray-400">첫 메시지를 남겨 보세요!</p>
                </div>
              )}
              {messages.map((message, index) => (
                <GroupChatMessage key={index} isMine={message.senderId === userId} messageData={message} />
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleScrollToBottom}
                className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-violet-100 bg-white/95 px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-violet-700 shadow-[0_4px_20px_rgba(109,40,217,0.15)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
              >
                <ArrowDown aria-hidden="true" size={16} />새 메시지 {unreadCount}개
              </button>
            )}
          </div>
          <div className="shrink-0 border-t border-violet-100/60 bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-1.5 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-50">
              <textarea
                ref={textareaRef}
                aria-label="메시지 입력"
                rows={1}
                maxLength={MAX_CHAT_MESSAGE_LENGTH}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  handleSendMessage();
                }}
                placeholder="메시지 입력"
                className="min-w-0 flex-1 resize-none scrollbar-thin rounded-xl border-0 bg-transparent px-2 py-2 text-sm leading-5 text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="button"
                aria-label="메시지 전송"
                disabled={!isConnected || !content.trim()}
                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm transition duration-200 hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none motion-reduce:transition-none"
                onClick={handleSendMessage}
              >
                <Send aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] leading-4">
              <span className="hidden items-center gap-2 text-gray-400 pointer-fine:inline-flex">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-[9px] text-gray-500">Shift</kbd>
                  <span>+</span>
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-[9px] text-gray-500">Enter</kbd>
                  <span>줄바꿈</span>
                </span>
                <span aria-hidden="true" className="h-2.5 w-px bg-gray-200" />
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-[9px] text-gray-500">Enter</kbd>
                  <span>전송</span>
                </span>
              </span>
              <span
                aria-label={`입력 ${content.length}자, 최대 ${MAX_CHAT_MESSAGE_LENGTH}자`}
                className={`ml-auto ${getMessageLengthClass(content)}`}
              >
                <span className="font-semibold">{content.length.toLocaleString()}</span>
                <span className="opacity-50">/</span>
                <span>{MAX_CHAT_MESSAGE_LENGTH.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </section>
      )}
      <button
        type="button"
        aria-label={isOpen ? "그룹 채팅 닫기" : `그룹 채팅 열기${unreadCount > 0 ? `, 새 메시지 ${unreadCount}개` : ""}`}
        aria-expanded={isOpen}
        onClick={handleToggleChat}
        className={`relative inline-flex size-14 cursor-pointer items-center justify-center rounded-2xl shadow-[0_8px_24px_-4px_rgba(109,40,217,0.35)] transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 motion-reduce:transform-none motion-reduce:transition-none ${isOpen ? "border border-violet-100 bg-white text-violet-600 hover:bg-violet-50" : "border border-violet-500 bg-linear-to-br from-violet-500 to-violet-700 text-white hover:shadow-[0_12px_28px_-4px_rgba(109,40,217,0.45)]"}`}
      >
        {isOpen ? <X aria-hidden="true" size={24} /> : <MessageCircle aria-hidden="true" size={24} />}
        {!isOpen && unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default GroupChat;
