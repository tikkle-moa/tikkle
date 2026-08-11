import { act, renderHook } from "@testing-library/react";

import { useHeader } from "@widgets/header/model/use-header";

const { mockHandleLogout, mockNavigate } = vi.hoisted(() => ({
  mockHandleLogout: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("@features/auth", () => ({
  useLogout: () => ({ handleLogout: mockHandleLogout }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("useHeader", () => {
  beforeEach(() => {
    mockHandleLogout.mockClear();
    mockNavigate.mockClear();
  });

  it("경로를 전달받아 이동한다", () => {
    const { result } = renderHook(() => useHeader());

    act(() => {
      result.current.handleNavigation("/concerts");
    });

    expect(mockNavigate).toHaveBeenCalledWith("/concerts");
  });

  it("로그아웃 핸들러를 제공한다", () => {
    const { result } = renderHook(() => useHeader());

    result.current.handleLogout();

    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });
});
