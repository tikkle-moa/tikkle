import { renderHook } from "@testing-library/react";

import { ROUTE_PATHS, type RoutePaths } from "@shared/config/router.config";

import { useMobileHeaderVisibility } from "@app/model/use-mobile-header-visibility";

let mockPathname: RoutePaths = ROUTE_PATHS.HOME;

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname }),
  };
});

describe("useMobileHeaderVisibility", () => {
  it.each([
    [ROUTE_PATHS.SEARCH, true],
    [ROUTE_PATHS.MY, true],
    [ROUTE_PATHS.HOME, false],
    [ROUTE_PATHS.CONCERTS, false],
  ])("%s 경로의 모바일 헤더 숨김 여부는 %s다", (pathname, isMobileHeaderHidden) => {
    mockPathname = pathname;

    const { result } = renderHook(() => useMobileHeaderVisibility());

    expect(result.current.isMobileHeaderHidden).toBe(isMobileHeaderHidden);
  });
});
