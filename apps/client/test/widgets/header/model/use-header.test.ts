import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

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

  it("로그인 페이지로 이동한다", () => {
    const { result } = renderHook(() => useHeader());

    act(() => {
      result.current.goToLogin();
    });

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.LOGIN);
  });

  it("로그아웃 핸들러를 제공한다", () => {
    const { result } = renderHook(() => useHeader());

    result.current.handleLogout();

    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });
});
