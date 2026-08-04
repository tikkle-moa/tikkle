import type { OAuthProviderConfig } from "@/features/auth/model/oauth.types";
import OAuthButton from "@/features/auth/ui/OAuthButton";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockConfig: OAuthProviderConfig = {
  label: "Google로 계속하기",
  iconSrc: "/google.svg",
  className: "bg-white text-slate-800",
};

describe("OAuthButton", () => {
  it("label을 렌더링한다", () => {
    render(<OAuthButton config={mockConfig} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Google로 계속하기/ })).toBeInTheDocument();
  });

  it("클릭 시 onSelect를 호출한다", async () => {
    const onSelect = vi.fn();
    render(<OAuthButton config={mockConfig} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("아이콘 img를 렌더링한다", () => {
    const { container } = render(<OAuthButton config={mockConfig} onSelect={vi.fn()} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/google.svg");
  });
});
