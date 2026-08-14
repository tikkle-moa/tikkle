import { renderHook } from "@testing-library/react";

import { ROUTE_PATHS, type RoutePaths } from "@shared/config/router.config";

import { useHeaderVisibility } from "@app/model/use-header-visibility";

let mockPathname: RoutePaths = ROUTE_PATHS.HOME;

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname }),
  };
});

describe("useHeaderVisibility", () => {
  it.each([
    [ROUTE_PATHS.SEARCH, true],
    [ROUTE_PATHS.MY, true],
    [ROUTE_PATHS.HOME, false],
    [ROUTE_PATHS.CONCERTS, false],
  ])("%s 경로의 모바일 헤더 숨김 여부는 %s다", (pathname, isHeaderHidden) => {
    mockPathname = pathname;

    const { result } = renderHook(() => useHeaderVisibility());

    expect(result.current.isHeaderHidden).toBe(isHeaderHidden);
  });
});
