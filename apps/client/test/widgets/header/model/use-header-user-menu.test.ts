import { act, renderHook } from "@testing-library/react";

import { useHeaderUserMenu } from "@widgets/header/model/use-header-user-menu";

describe("useHeaderUserMenu", () => {
  it("초기에는 사용자 메뉴가 닫혀 있다", () => {
    const { result } = renderHook(() => useHeaderUserMenu());

    expect(result.current.isUserMenuOpen).toBe(false);
  });

  it("메뉴 토글 시 열림 상태와 닫힘 상태가 전환된다", () => {
    const { result } = renderHook(() => useHeaderUserMenu());

    act(() => {
      result.current.handleUserMenuToggle();
    });

    expect(result.current.isUserMenuOpen).toBe(true);

    act(() => {
      result.current.handleUserMenuToggle();
    });

    expect(result.current.isUserMenuOpen).toBe(false);
  });

  it("메뉴 닫기 호출 시 닫힘 상태가 된다", () => {
    const { result } = renderHook(() => useHeaderUserMenu());

    act(() => {
      result.current.handleUserMenuToggle();
      result.current.handleUserMenuClose();
    });

    expect(result.current.isUserMenuOpen).toBe(false);
  });
});
