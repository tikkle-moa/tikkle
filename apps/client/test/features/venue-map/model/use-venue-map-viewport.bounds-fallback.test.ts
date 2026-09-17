import type { PointerEvent } from "react";

import { act, renderHook } from "@testing-library/react";

import { useVenueMapViewport } from "@features/venue-map/model/use-venue-map-viewport";

let nullRefCount = 0;

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useRef: (initial: unknown) => {
      if (initial === null) nullRefCount += 1;

      const ref = actual.useRef(initial);
      if (initial === null && nullRefCount === 4) {
        return {
          get current() {
            return null;
          },
          set current(_value: unknown) {},
        };
      }

      return ref;
    },
  };
});

describe("useVenueMapViewport bounds fallback", () => {
  it("pointer bounds cache가 없으면 현재 SVG bounds를 다시 조회한다", () => {
    const getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getBoundingClientRect = getBoundingClientRect;
    svg.setPointerCapture = vi.fn();
    const { result } = renderHook(() => useVenueMapViewport({ width: 100, height: 100 }));

    act(() => {
      result.current.handlePointerDown({
        pointerId: 1,
        pointerType: "touch",
        button: 0,
        clientX: 50,
        clientY: 50,
        currentTarget: svg,
        target: svg,
      } as unknown as PointerEvent<SVGSVGElement>);
    });

    expect(getBoundingClientRect).toHaveBeenCalledTimes(2);
  });
});
