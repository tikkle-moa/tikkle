import { act, render, screen } from "@testing-library/react";

import { ROUTE_PATHS, type RoutePaths } from "@shared/config/router.config";

import { useSecondaryHeaderVisibility } from "@app/model/use-secondary-header-visibility";

let mockPathname: RoutePaths = ROUTE_PATHS.HOME;
let observerCallback: IntersectionObserverCallback;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return {
    ...actual,
    useLocation: () => ({ pathname: mockPathname }),
  };
});

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }

  disconnect = mockDisconnect;
  observe = mockObserve;
  root = null;
  rootMargin = "";
  thresholds = [];
  takeRecords = () => [];
  unobserve = vi.fn();
}

const VisibilityHarness = () => {
  const { heroRef, isSecondaryHeaderVisible, scrollContainerRef } = useSecondaryHeaderVisibility();

  return (
    <>
      <main ref={scrollContainerRef} />
      <div ref={heroRef} />
      <output>{String(isSecondaryHeaderVisible)}</output>
    </>
  );
};

describe("useSecondaryHeaderVisibility", () => {
  beforeEach(() => {
    mockPathname = ROUTE_PATHS.HOME;
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("홈 히어로를 지나기 전에는 보조 헤더를 표시한다", () => {
    render(<VisibilityHarness />);

    expect(mockObserve).toHaveBeenCalledOnce();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("rootBounds가 없으면 기준 상단값 0으로 카테고리 위치를 판단한다", () => {
    render(<VisibilityHarness />);

    act(() => {
      observerCallback(
        [
          {
            boundingClientRect: { bottom: -1 },
            rootBounds: null,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("히어로 영역 표시 상태가 같으면 현재 상태를 유지한다", () => {
    render(<VisibilityHarness />);

    act(() => {
      observerCallback(
        [
          {
            boundingClientRect: { bottom: 1 },
            rootBounds: { top: 0 },
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("히어로 영역을 위로 지나면 보조 헤더를 숨긴다", () => {
    render(<VisibilityHarness />);

    act(() => {
      observerCallback(
        [
          {
            boundingClientRect: { bottom: -1 },
            rootBounds: { top: 0 },
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("히어로 영역이 다시 보이면 보조 헤더를 다시 표시한다", () => {
    render(<VisibilityHarness />);

    act(() => {
      observerCallback(
        [
          {
            boundingClientRect: { bottom: -1 },
            rootBounds: { top: 0 },
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    act(() => {
      observerCallback(
        [
          {
            boundingClientRect: { bottom: 1 },
            rootBounds: { top: 0 },
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("홈이 아닌 경로에서는 관찰하지 않고 보조 헤더를 표시한다", () => {
    mockPathname = ROUTE_PATHS.CONCERTS;

    render(<VisibilityHarness />);

    expect(mockObserve).not.toHaveBeenCalled();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("언마운트 시 observer 연결을 해제한다", () => {
    const { unmount } = render(<VisibilityHarness />);

    unmount();

    expect(mockDisconnect).toHaveBeenCalledOnce();
  });
});
