import { MemoryRouter } from "react-router";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ROUTE_PATHS } from "@shared/config/router.config";

import UserMenu from "@widgets/header/ui/UserMenu";

const mockLogout = vi.fn();

const renderUserMenu = () => {
  render(
    <MemoryRouter>
      <UserMenu nickname="테스트 사용자" profileImageUrl={null} onLogout={mockLogout} />
    </MemoryRouter>,
  );
};

describe("UserMenu", () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it("프로필 이미지 URL이 있으면 사용자 이미지를 표시한다", () => {
    render(<UserMenu nickname="테스트 사용자" profileImageUrl="https://example.com/profile.png" onLogout={mockLogout} />);

    expect(screen.getByAltText("테스트 사용자 프로필 이미지")).toHaveAttribute("src", "https://example.com/profile.png");
  });

  it("외부 영역을 클릭하면 열린 메뉴를 닫는다", async () => {
    const user = userEvent.setup();

    renderUserMenu();

    await user.click(screen.getByRole("button", { name: "테스트 사용자" }));
    await user.click(document.body);

    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });

  it("Escape 키를 누르면 열린 메뉴를 닫는다", async () => {
    const user = userEvent.setup();

    renderUserMenu();

    await user.click(screen.getByRole("button", { name: "테스트 사용자" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });

  it("Escape 외의 키를 누르면 열린 메뉴를 유지한다", async () => {
    const user = userEvent.setup();

    renderUserMenu();

    await user.click(screen.getByRole("button", { name: "테스트 사용자" }));
    fireEvent.keyDown(document, { key: "Tab" });

    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("내 예약과 관심 메뉴 링크를 표시한다", async () => {
    const user = userEvent.setup();

    renderUserMenu();

    await user.click(screen.getByRole("button", { name: "테스트 사용자" }));

    expect(screen.getByRole("link", { name: "내 예약" })).toHaveAttribute("href", ROUTE_PATHS.MY_RESERVATIONS);
    expect(screen.getByRole("link", { name: "관심" })).toHaveAttribute("href", ROUTE_PATHS.MY_FAVORITES);
  });

  it("로그아웃 메뉴를 클릭하면 메뉴를 닫고 로그아웃을 호출한다", async () => {
    const user = userEvent.setup();

    renderUserMenu();

    await user.click(screen.getByRole("button", { name: "테스트 사용자" }));
    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });
});
