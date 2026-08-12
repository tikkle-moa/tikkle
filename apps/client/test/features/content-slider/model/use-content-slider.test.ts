import { act, renderHook } from "@testing-library/react";
import type { Swiper as SwiperType } from "swiper";

import { useContentSlider } from "@features/content-slider/model/use-content-slider";

const makeMockSwiper = () =>
  ({
    autoplay: { start: vi.fn(), stop: vi.fn() },
  }) as unknown as SwiperType;

describe("useContentSlider", () => {
  it("초기 상태는 currentIndex 0, isPlaying true이다", () => {
    const { result } = renderHook(() => useContentSlider());

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });

  it("swiperRef가 null이면 handleToggleAutoplay는 아무것도 하지 않는다", () => {
    const { result } = renderHook(() => useContentSlider());

    act(() => result.current.handleToggleAutoplay());

    expect(result.current.isPlaying).toBe(true);
  });

  it("isPlaying이 true일 때 handleToggleAutoplay는 autoplay.stop을 호출하고 isPlaying을 false로 변경한다", () => {
    const { result } = renderHook(() => useContentSlider());
    const mockSwiper = makeMockSwiper();
    result.current.swiperRef.current = mockSwiper;

    act(() => result.current.handleToggleAutoplay());

    expect(mockSwiper.autoplay.stop).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(false);
  });

  it("isPlaying이 false일 때 handleToggleAutoplay는 autoplay.start를 호출하고 isPlaying을 true로 변경한다", () => {
    const { result } = renderHook(() => useContentSlider());
    const mockSwiper = makeMockSwiper();
    result.current.swiperRef.current = mockSwiper;

    act(() => result.current.handleToggleAutoplay()); // true → false
    act(() => result.current.handleToggleAutoplay()); // false → true

    expect(mockSwiper.autoplay.start).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it("setCurrentIndex로 currentIndex를 업데이트할 수 있다", () => {
    const { result } = renderHook(() => useContentSlider());

    act(() => result.current.setCurrentIndex(3));

    expect(result.current.currentIndex).toBe(3);
  });
});
