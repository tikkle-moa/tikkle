import { MAX_CHAT_MESSAGE_LENGTH } from "./group-chat.constants";

export const countMessagesBelow = (list: HTMLDivElement) => {
  const visibleBottom = list.getBoundingClientRect().top + list.clientTop + list.clientHeight;
  return Array.from(list.querySelectorAll<HTMLElement>("[data-other-message]")).filter(
    (message) => message.getBoundingClientRect().bottom > visibleBottom + 1,
  ).length;
};

export const getMessageLengthClass = (content: string) => {
  const baseStyle = "inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 tabular-nums transition-colors";
  if (content.length >= MAX_CHAT_MESSAGE_LENGTH) return `${baseStyle} bg-rose-50 text-rose-600`;
  if (content.length >= MAX_CHAT_MESSAGE_LENGTH * 0.9) return `${baseStyle} bg-amber-50 text-amber-600`;
  return `${baseStyle} text-gray-400`;
};
