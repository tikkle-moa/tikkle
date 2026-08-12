import type { ReactNode } from "react";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ContentSlider from "@features/content-slider/ui/ContentSlider";

const { mockSwiperInstance } = vi.hoisted(() => ({
  mockSwiperInstance: {
    autoplay: { start: vi.fn(), stop: vi.fn() },
    slidePrev: vi.fn(),
    slideNext: vi.fn(),
    // onSlideChange 콜백을 저장해 테스트에서 직접 호출
    triggerSlideChange: null as ((s: { realIndex: number }) => void) | null,
  },
}));

vi.mock("swiper/css", () => ({}));
vi.mock("swiper/modules", () => ({ Autoplay: {} }));
vi.mock("swiper/react", () => ({
  // onSwiper·onSlideChange 콜백을 캡처해 목 인스턴스에 저장
  Swiper: ({
    children,
    onSwiper,
    onSlideChange,
  }: {
    children: ReactNode;
    onSwiper?: (s: unknown) => void;
    onSlideChange?: (s: { realIndex: number }) => void;
  }) => {
    onSwiper?.(mockSwiperInstance);
    mockSwiperInstance.triggerSlideChange = onSlideChange ?? null;
    return <div>{children}</div>;
  },
  SwiperSlide: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const ITEMS = [<div key={1}>슬라이드 1</div>, <div key={2}>슬라이드 2</div>, <div key={3}>슬라이드 3</div>];

describe("ContentSlider", () => {
  beforeEach(() => {
    mockSwiperInstance.slidePrev.mockClear();
    mockSwiperInstance.slideNext.mockClear();
    mockSwiperInstance.autoplay.start.mockClear();
    mockSwiperInstance.autoplay.stop.mockClear();
    mockSwiperInstance.triggerSlideChange = null;
  });

  it("슬라이드 아이템을 렌더링한다", () => {
    render(<ContentSlider items={ITEMS} />);

    expect(screen.getByText("슬라이드 1")).toBeInTheDocument();
    expect(screen.getByText("슬라이드 2")).toBeInTheDocument();
    expect(screen.getByText("슬라이드 3")).toBeInTheDocument();
  });

  it("이전·다음 슬라이드 버튼을 렌더링한다", () => {
    render(<ContentSlider items={ITEMS} />);

    expect(screen.getByRole("button", { name: "이전 슬라이드" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 슬라이드" })).toBeInTheDocument();
  });

  it("슬라이드 카운터를 렌더링한다 (01 / N)", () => {
    render(<ContentSlider items={ITEMS} />);

    expect(screen.getByText("01 / 03")).toBeInTheDocument();
  });

  it("초기 상태에서 일시정지 버튼을 렌더링한다 (isPlaying = true)", () => {
    render(<ContentSlider items={ITEMS} />);

    expect(screen.getByRole("button", { name: "자동 재생 일시정지" })).toBeInTheDocument();
  });

  it("이전 버튼 클릭 시 slidePrev를 호출한다", async () => {
    const user = userEvent.setup();
    render(<ContentSlider items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "이전 슬라이드" }));

    expect(mockSwiperInstance.slidePrev).toHaveBeenCalledTimes(1);
  });

  it("다음 버튼 클릭 시 slideNext를 호출한다", async () => {
    const user = userEvent.setup();
    render(<ContentSlider items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "다음 슬라이드" }));

    expect(mockSwiperInstance.slideNext).toHaveBeenCalledTimes(1);
  });

  it("재생/일시정지 버튼 클릭 시 autoplay를 토글하고 버튼 레이블이 바뀐다", async () => {
    const user = userEvent.setup();
    render(<ContentSlider items={ITEMS} />);

    // isPlaying true → 클릭 → stop 호출, 시작 버튼으로 변경
    await user.click(screen.getByRole("button", { name: "자동 재생 일시정지" }));

    expect(mockSwiperInstance.autoplay.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "자동 재생 시작" })).toBeInTheDocument();

    // isPlaying false → 클릭 → start 호출, 일시정지 버튼으로 변경
    await user.click(screen.getByRole("button", { name: "자동 재생 시작" }));

    expect(mockSwiperInstance.autoplay.start).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "자동 재생 일시정지" })).toBeInTheDocument();
  });

  it("슬라이드 변경 시 카운터가 업데이트된다", () => {
    render(<ContentSlider items={ITEMS} />);

    act(() => mockSwiperInstance.triggerSlideChange?.({ realIndex: 2 }));

    expect(screen.getByText("03 / 03")).toBeInTheDocument();
  });
});
