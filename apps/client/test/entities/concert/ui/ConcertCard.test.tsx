import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConcertCard, type ConcertResponse } from "@entities/concert";
import type { PerformanceResponse } from "@entities/performance";

const FUTURE = new Date("2099-01-01").toISOString();
const PAST = new Date("2000-01-01").toISOString();

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  startsAt: FUTURE,
  bookingOpensAt: null,
  createdAt: new Date("2026-01-01").toISOString(),
  ...overrides,
});

const makeConcert = (overrides: Partial<ConcertResponse> = {}): ConcertResponse => ({
  id: 1,
  title: "테스트 콘서트",
  genre: "BALLAD",
  placeName: "올림픽공원",
  posterUrl: "https://example.com/poster.jpg",
  description: "테스트 콘서트 설명",
  createdAt: new Date("2026-01-01").toISOString(),
  ...overrides,
});

describe("ConcertCard", () => {
  it("posterUrl이 있으면 img를 렌더링한다", () => {
    render(<ConcertCard concert={makeConcert()} performances={[makePerformance()]} />);

    expect(screen.getByRole("img", { name: "테스트 콘서트" })).toBeInTheDocument();
  });

  it("posterUrl이 없으면 img 대신 텍스트 플레이스홀더를 렌더링한다", () => {
    render(<ConcertCard concert={makeConcert({ posterUrl: undefined })} performances={[makePerformance()]} displayOptions={{ showTitle: true }} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // 플레이스홀더와 하단 텍스트 영역에 각각 한 번씩 표시
    expect(screen.getAllByText("테스트 콘서트")).toHaveLength(2);
  });

  it("공연 제목을 렌더링한다", () => {
    render(<ConcertCard concert={makeConcert()} performances={[makePerformance()]} displayOptions={{ showTitle: true }} />);

    expect(screen.getByText("테스트 콘서트")).toBeInTheDocument();
  });

  it("장소명을 렌더링한다", () => {
    render(<ConcertCard concert={makeConcert()} performances={[makePerformance()]} displayOptions={{ showPlaceName: true }} />);

    expect(screen.getByText("올림픽공원")).toBeInTheDocument();
  });

  it("available 상태 배지를 렌더링한다", () => {
    render(<ConcertCard concert={makeConcert()} performances={[makePerformance()]} displayOptions={{ showStatus: true }} />);

    expect(screen.getByText("예매 중")).toBeInTheDocument();
  });

  it("ended 상태 배지를 렌더링한다", () => {
    render(<ConcertCard concert={makeConcert()} performances={[makePerformance({ startsAt: PAST })]} displayOptions={{ showStatus: true }} />);

    expect(screen.getByText("공연 종료")).toBeInTheDocument();
  });

  it("upcoming 상태 배지를 렌더링한다", () => {
    render(
      <ConcertCard concert={makeConcert()} performances={[makePerformance({ bookingOpensAt: FUTURE })]} displayOptions={{ showStatus: true }} />,
    );

    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
  });

  it("마우스를 올리면 글레어 오버레이를 렌더링한다", async () => {
    const user = userEvent.setup();
    const { container } = render(<ConcertCard concert={makeConcert()} performances={[makePerformance()]} />);

    await user.hover(container.querySelector(".perspective-midrange")!);

    expect(container.querySelector(".pointer-events-none")).toBeInTheDocument();
  });

  it("마우스가 떠나면 글레어 오버레이를 제거한다", async () => {
    const user = userEvent.setup();
    const { container } = render(<ConcertCard concert={makeConcert()} performances={[makePerformance()]} />);
    const tiltEl = container.querySelector(".perspective-midrange")!;

    await user.hover(tiltEl);
    await user.unhover(tiltEl);

    expect(container.querySelector(".pointer-events-none")).not.toBeInTheDocument();
  });
});
