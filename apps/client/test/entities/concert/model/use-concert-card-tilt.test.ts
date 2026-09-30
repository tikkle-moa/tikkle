import { act, renderHook } from "@testing-library/react";

import { DEFAULT_MAX_TILT, DEFAULT_SHADOW_OFFSET } from "@entities/concert/model/concert-card.constants";
import { useConcertCardTilt } from "@entities/concert/model/use-concert-card-tilt";

const useMakeHook = () => useConcertCardTilt({ maxTilt: DEFAULT_MAX_TILT, shadowOffset: DEFAULT_SHADOW_OFFSET });

describe("useConcertCardTilt", () => {
  it("초기 상태는 tilt (0, 0), isHovered false, glare (50, 50)이다", () => {
    const { result } = renderHook(useMakeHook);

    expect(result.current.tilt).toEqual({ rotateX: 0, rotateY: 0 });
    expect(result.current.isHovered).toBe(false);
    expect(result.current.glare).toEqual({ x: 50, y: 50 });
  });

  it("handlePointerEnter 호출 시 isHovered가 true가 된다", () => {
    const { result } = renderHook(useMakeHook);

    act(() => result.current.handlePointerEnter());

    expect(result.current.isHovered).toBe(true);
  });

  it("handlePointerLeave 호출 시 isHovered가 false이고 tilt가 (0, 0)으로 리셋된다", () => {
    const { result } = renderHook(useMakeHook);

    act(() => result.current.handlePointerEnter());
    act(() => result.current.handlePointerLeave());

    expect(result.current.isHovered).toBe(false);
    expect(result.current.tilt).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it("handlePointerMove 호출 시 tilt와 glare가 마우스 위치에 따라 업데이트된다", () => {
    const { result } = renderHook(useMakeHook);

    result.current.cardRef.current = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 300 }) as DOMRect,
    } as HTMLDivElement;

    act(() => {
      result.current.handlePointerMove({
        clientX: 150,
        clientY: 300,
        pointerType: "mouse",
      } as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.tilt.rotateY).toBeCloseTo(DEFAULT_MAX_TILT * 0.5);
    expect(result.current.tilt.rotateX).toBeCloseTo(-DEFAULT_MAX_TILT);
    expect(result.current.glare.x).toBeCloseTo(75);
    expect(result.current.glare.y).toBeCloseTo(100);
  });

  it("touch 이벤트이면 handlePointerMove가 tilt를 변경하지 않는다", () => {
    const { result } = renderHook(useMakeHook);

    result.current.cardRef.current = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 300 }) as DOMRect,
    } as HTMLDivElement;

    act(() => {
      result.current.handlePointerMove({ clientX: 150, clientY: 300, pointerType: "touch" } as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.tilt).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it("cardRef.current가 null이면 handlePointerMove는 tilt를 변경하지 않는다", () => {
    const { result } = renderHook(useMakeHook);

    act(() => {
      result.current.handlePointerMove({ clientX: 100, clientY: 100, pointerType: "mouse" } as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.tilt).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it("hover 상태가 아니면 기본 그림자 문자열을 반환한다", () => {
    const { result } = renderHook(useMakeHook);

    expect(result.current.outerShadow).toBe("0 6px 20px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.07)");
  });

  it("hover 상태이면 동적 그림자 문자열을 반환한다", () => {
    const { result } = renderHook(useMakeHook);

    act(() => result.current.handlePointerEnter());

    expect(result.current.outerShadow).toContain("rgba(100, 50, 180, 0.22)");
  });
});
