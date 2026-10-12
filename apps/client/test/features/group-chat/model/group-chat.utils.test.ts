import { countMessagesBelow } from "@features/group-chat/model/group-chat.utils";

describe("countMessagesBelow", () => {
  it("높이가 다른 상대 메시지 중 아래에 잘린 메시지와 완전히 아래에 있는 메시지를 센다", () => {
    const list = document.createElement("div");
    list.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    Object.defineProperties(list, { clientTop: { value: 2 }, clientHeight: { value: 200 } });
    for (const bottom of [180, 302, 303, 304, 500]) {
      const message = document.createElement("div");
      message.setAttribute("data-other-message", "");
      message.getBoundingClientRect = () => ({ bottom }) as DOMRect;
      list.append(message);
    }
    const mine = document.createElement("div");
    mine.getBoundingClientRect = () => ({ bottom: 700 }) as DOMRect;
    list.append(mine);
    expect(countMessagesBelow(list)).toBe(2);
  });

  it("상대 메시지가 없으면 0이다", () => {
    expect(countMessagesBelow(document.createElement("div"))).toBe(0);
  });
});
