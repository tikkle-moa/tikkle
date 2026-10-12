import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { GroupChatEventData } from "@tikkle/api-types";

import { useStompStore } from "@shared/realtime/stomp.store";

import { useSessionStore } from "@entities/session";

import { MAX_CHAT_TEXTAREA_ROWS } from "./group-chat.constants";
import { countMessagesBelow } from "./group-chat.utils";

interface UseGroupChatProps {
  groupId: number;
  performanceId: number;
}

export const useGroupChat = ({ groupId, performanceId }: UseGroupChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<GroupChatEventData[]>([]);
  const [content, setContent] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const isOpenRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const savedScrollTopRef = useRef(0);
  const wasOpenRef = useRef(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userId = useSessionStore((state) => state.user?.id);
  const stompClient = useStompStore((state) => state.stompClient);
  const isConnected = useStompStore((state) => state.connectionStatus === "connected");
  const getStompClient = useStompStore((state) => state.getStompClient);

  useEffect(() => {
    const resetChatState = () => {
      setMessages([]);
      setContent("");
      setUnreadCount(0);
      setIsOpen(false);
      isOpenRef.current = false;
      isAtBottomRef.current = true;
      savedScrollTopRef.current = 0;
      wasOpenRef.current = false;
    };

    resetChatState();
  }, [groupId, performanceId]);

  useEffect(() => {
    if (isConnected) return;
    getStompClient();
  }, [isConnected, getStompClient]);

  useEffect(() => {
    if (!isConnected || !stompClient) return;

    const chatSubscription = stompClient.subscribeEvent({
      path: "/groups/{groupId}/chat",
      pathParams: { groupId },
      headerParams: { performanceId },
      callback: (event) => {
        if (event.data.senderId === userId) {
          if (isOpenRef.current) isAtBottomRef.current = true;
        } else if (!isOpenRef.current || !isAtBottomRef.current) {
          setUnreadCount((prev) => prev + 1);
        }
        setMessages((prevMessages) => [...prevMessages, event.data]);
      },
    });

    return () => {
      chatSubscription.unsubscribe();
    };
  }, [groupId, isConnected, performanceId, stompClient, userId]);

  useLayoutEffect(() => {
    const list = messageListRef.current;
    if (list && isOpen) {
      if (!wasOpenRef.current) {
        list.scrollTop = savedScrollTopRef.current;
      } else if (isAtBottomRef.current) {
        list.scrollTop = list.scrollHeight;
      }
      savedScrollTopRef.current = list.scrollTop;
      isAtBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight <= 24;
      const remainingCount = countMessagesBelow(list);
      setUnreadCount((count) => Math.min(count, remainingCount));
    }
    wasOpenRef.current = isOpen;
  }, [messages, isOpen, content]);

  const handleMessageScroll = () => {
    const list = messageListRef.current;
    if (!list) return;

    savedScrollTopRef.current = list.scrollTop;
    isAtBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight <= 24;
    const remainingCount = countMessagesBelow(list);
    setUnreadCount((count) => Math.min(count, remainingCount));
  };

  const handleScrollToBottom = () => {
    const list = messageListRef.current;
    if (!list) return;

    list.scrollTo({
      top: list.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const styles = window.getComputedStyle(textarea);
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const maxHeight = parseFloat(styles.lineHeight) * MAX_CHAT_TEXTAREA_ROWS + padding + border;
    textarea.style.height = `${Math.min(textarea.scrollHeight + border, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight + border > maxHeight ? "auto" : "hidden";
  }, [content, isOpen]);

  const handleSendMessage = () => {
    const trimmedContent = content.trim();
    if (!stompClient || !isConnected || !trimmedContent) return;

    stompClient.publish({
      path: "/groups/chat",
      command: {
        requestId: crypto.randomUUID(),
        data: { content: trimmedContent, performanceId },
      },
    });
    setContent("");
  };

  const handleToggleChat = () => {
    const nextIsOpen = !isOpenRef.current;
    isOpenRef.current = nextIsOpen;
    if (!nextIsOpen && messageListRef.current) {
      savedScrollTopRef.current = messageListRef.current.scrollTop;
    }
    setIsOpen(nextIsOpen);
  };

  return {
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
  };
};
