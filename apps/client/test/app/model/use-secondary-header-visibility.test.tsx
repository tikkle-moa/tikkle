import { act, render, screen } from "@testing-library/react";

import { useSecondaryHeaderVisibility } from "@app/model/use-secondary-header-visibility";

let observerCallback: IntersectionObserverCallback;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
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

const WithoutHeroHarness = () => {
  const { isSecondaryHeaderVisible, scrollContainerRef } = useSecondaryHeaderVisibility();

  return (
    <>
      <main ref={scrollContainerRef} />
      <output>{String(isSecondaryHeaderVisible)}</output>
    </>
  );
};

describe("useSecondaryHeaderVisibility", () => {
  beforeEach(() => {
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

  it("히어로가 없으면 보조 헤더를 표시하고 관찰하지 않는다", () => {
    render(<WithoutHeroHarness />);

    expect(mockObserve).not.toHaveBeenCalled();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("언마운트 시 observer 연결을 해제한다", () => {
    const { unmount } = render(<VisibilityHarness />);

    unmount();

    expect(mockDisconnect).toHaveBeenCalledOnce();
  });
});
