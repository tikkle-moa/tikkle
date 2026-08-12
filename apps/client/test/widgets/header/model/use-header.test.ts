import { renderHook } from "@testing-library/react";

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
});
