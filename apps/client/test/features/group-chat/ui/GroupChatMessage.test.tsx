import { cleanup, render, screen } from "@testing-library/react";
import type { GroupChatEventData } from "@tikkle/api-types";

import GroupChatMessage from "@features/group-chat/ui/GroupChatMessage";

const message: GroupChatEventData = {
  senderId: 2,
  senderNickname: "관객",
  senderProfileImageUrl: "https://example.com/profile.png",
  content: "첫 줄\n다음 줄",
  groupId: 1,
  sentAt: "2026-10-12T08:00:00Z",
};

describe("GroupChatMessage", () => {
  afterEach(cleanup);

  it("상대 메시지는 집계용 속성과 프로필, 닉네임을 표시한다", () => {
    const { container } = render(<GroupChatMessage isMine={false} messageData={message} />);
    expect(container.firstElementChild).toHaveAttribute("data-other-message", "");
    expect(screen.getByRole("img", { name: "관객" })).toHaveAttribute("src", message.senderProfileImageUrl);
    expect(screen.getByText("관객")).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute("datetime", message.sentAt);
    expect(screen.getByText("첫 줄 다음 줄")).toHaveTextContent("첫 줄 다음 줄");
  });

  it("내 메시지는 상대 메시지 집계에서 제외하고 프로필을 숨긴다", () => {
    const { container } = render(<GroupChatMessage isMine messageData={message} />);
    expect(container.firstElementChild).not.toHaveAttribute("data-other-message");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("나")).toBeInTheDocument();
  });
});
