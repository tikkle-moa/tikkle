import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { OAuthErrorContent } from "@pages/login/model/oauth-error.types";
import { OAuthErrorModal } from "@pages/login/ui/OAuthErrorModal";

const mockContent: OAuthErrorContent = {
  title: "로그인이 취소됐어요",
  description: "계정 접근에 동의하지 않아 로그인을 완료하지 못했습니다.",
  actionLabel: "다시 로그인하기",
};

describe("OAuthErrorModal", () => {
  it("title, description, actionLabel을 렌더링한다", () => {
    render(<OAuthErrorModal content={mockContent} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: mockContent.title })).toBeInTheDocument();
    expect(screen.getByText(mockContent.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: mockContent.actionLabel })).toBeInTheDocument();
  });

  it("버튼 클릭 시 onClose를 호출한다", async () => {
    const onClose = vi.fn();
    render(<OAuthErrorModal content={mockContent} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: mockContent.actionLabel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
