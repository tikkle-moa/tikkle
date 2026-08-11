import { renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useSessionStore } from "@entities/session";

import { useLogoutNavigator } from "@app/model/use-logout-navigator";

const { MOCK_PROTECTED_PATH } = vi.hoisted(() => ({ MOCK_PROTECTED_PATH: "/protected" }));

const mockNavigate = vi.fn();
let mockPathname: string = ROUTE_PATHS.HOME;

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockPathname }),
  };
});

vi.mock("@shared/config/router.config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/config/router.config")>();
  return {
    ...actual,
    AUTH_GUARD_PATHS: [MOCK_PROTECTED_PATH],
  };
});

describe("useLogoutNavigator", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPathname = ROUTE_PATHS.HOME;
    useSessionStore.setState({ user: null, status: "loading", justLoggedOut: false });
  });

  it("justLoggedOut이 false이면 아무것도 하지 않는다", () => {
    renderHook(() => useLogoutNavigator());

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe("loading");
  });

  it("justLoggedOut이 true이고 보호된 경로이면 홈으로 이동한다", () => {
    mockPathname = MOCK_PROTECTED_PATH;
    useSessionStore.setState({ user: null, status: "loading", justLoggedOut: true });

    renderHook(() => useLogoutNavigator());

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.HOME, { replace: true });
    expect(useSessionStore.getState().justLoggedOut).toBe(true);
  });

  it("justLoggedOut이 true이고 보호되지 않은 경로이면 세션을 초기화한다", () => {
    mockPathname = ROUTE_PATHS.HOME;
    useSessionStore.setState({ user: null, status: "loading", justLoggedOut: true });

    renderHook(() => useLogoutNavigator());

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe("unauthenticated");
    expect(useSessionStore.getState().justLoggedOut).toBe(false);
  });
});
