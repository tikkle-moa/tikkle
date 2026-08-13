import { act, fireEvent, renderHook } from "@testing-library/react";

import { useHeader } from "@widgets/header/model/use-header";

const mockHandleLogout = vi.hoisted(() => vi.fn());

vi.mock("@features/auth", () => ({
  useLogout: () => ({ handleLogout: mockHandleLogout }),
}));

describe("useHeader", () => {
  beforeEach(() => {
    mockHandleLogout.mockClear();
  });

  it("로그아웃 핸들러를 제공한다", () => {
    const { result } = renderHook(() => useHeader());

    result.current.handleLogout();

    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });

  it("검색 패널 열기 호출 시 열린 상태가 된다", () => {
    const { result } = renderHook(() => useHeader());

    act(() => {
      result.current.handleSearchOverlayOpen();
    });

    expect(result.current.isSearchOverlayOpen).toBe(true);
  });

  it("검색 패널이 열린 상태에서 외부를 클릭하면 닫힌다", () => {
    const { result } = renderHook(() => useHeader());

    act(() => {
      result.current.handleSearchOverlayOpen();
    });

    fireEvent.pointerDown(document.body);

    expect(result.current.isSearchOverlayOpen).toBe(false);
  });

  it("검색 패널이 열린 상태에서 Escape를 누르면 닫힌다", () => {
    const { result } = renderHook(() => useHeader());

    act(() => {
      result.current.handleSearchOverlayOpen();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(result.current.isSearchOverlayOpen).toBe(false);
  });

  it("검색 패널이 닫히면 등록한 이벤트 리스너를 해제한다", () => {
    const removeEventListener = vi.spyOn(document, "removeEventListener");
    const { result, unmount } = renderHook(() => useHeader());

    act(() => {
      result.current.handleSearchOverlayOpen();
    });

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));

    removeEventListener.mockRestore();
  });

  it("검색 패널 내부를 클릭하면 열린 상태를 유지한다", () => {
    const { result } = renderHook(() => useHeader());
    const searchOverlayElement = document.createElement("div");

    document.body.append(searchOverlayElement);

    Object.assign(result.current.searchOverlayRef, {
      current: searchOverlayElement,
    });

    act(() => {
      result.current.handleSearchOverlayOpen();
    });

    fireEvent.pointerDown(searchOverlayElement);

    expect(result.current.isSearchOverlayOpen).toBe(true);

    searchOverlayElement.remove();
  });

  it("Escape 외의 키를 누르면 검색 패널을 유지한다", () => {
    const { result } = renderHook(() => useHeader());

    act(() => {
      result.current.handleSearchOverlayOpen();
    });

    fireEvent.keyDown(document, { key: "Enter" });

    expect(result.current.isSearchOverlayOpen).toBe(true);
  });
});
