import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UserMenu from "@widgets/header/ui/UserMenu";

const mockLogout = vi.fn();

const renderUserMenu = () => {
  render(<UserMenu nickname="테스트 사용자" onLogout={mockLogout} />);
};

describe("UserMenu", () => {
  beforeEach(() => {
    mockLogout.mockClear();
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

  it("로그아웃 메뉴를 클릭하면 메뉴를 닫고 로그아웃을 호출한다", async () => {
    const user = userEvent.setup();

    renderUserMenu();

    await user.click(screen.getByRole("button", { name: "테스트 사용자" }));
    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
  });
});
