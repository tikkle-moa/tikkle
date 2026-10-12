export const countMessagesBelow = (list: HTMLDivElement) => {
  const visibleBottom = list.getBoundingClientRect().top + list.clientTop + list.clientHeight;
  return Array.from(list.querySelectorAll<HTMLElement>("[data-other-message]")).filter(
    (message) => message.getBoundingClientRect().bottom > visibleBottom + 1,
  ).length;
};
