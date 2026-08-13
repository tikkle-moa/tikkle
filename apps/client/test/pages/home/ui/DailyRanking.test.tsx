import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DailyRanking from "@pages/home/ui/DailyRanking";

const { mockConcerts } = vi.hoisted(() => ({
  mockConcerts: [
    {
      id: 1,
      title: "랭킹 콘서트 1",
      genre: "ballad" as const,
      placeName: "올림픽공원",
      posterUrl: "https://example.com/1.jpg",
      createdAt: new Date("2026-01-01"),
      performances: [
        {
          id: 1,
          concertId: 1,
          startsAt: new Date("2099-01-01"),
          bookingOpensAt: new Date("2000-01-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 100,
          bookedSeats: 50,
        },
      ],
    },
    {
      id: 2,
      title: "랭킹 콘서트 2",
      genre: "rock-metal" as const,
      placeName: "잠실실내체육관",
      posterUrl: "https://example.com/2.jpg",
      createdAt: new Date("2026-01-01"),
      performances: [
        {
          id: 2,
          concertId: 2,
          startsAt: new Date("2099-01-01"),
          bookingOpensAt: new Date("2099-01-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 200,
          bookedSeats: 0,
        },
      ],
    },
    {
      id: 3,
      title: "랭킹 콘서트 3",
      genre: "festival" as const,
      placeName: "고척스카이돔",
      posterUrl: "https://example.com/3.jpg",
      createdAt: new Date("2026-01-01"),
      performances: [
        {
          id: 3,
          concertId: 3,
          startsAt: new Date("2099-01-01"),
          bookingOpensAt: new Date("2000-01-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 500,
          bookedSeats: 500,
        },
      ],
    },
    {
      id: 4,
      title: "랭킹 콘서트 4",
      genre: "indie" as const,
      placeName: "블루스퀘어",
      posterUrl: "https://example.com/4.jpg",
      createdAt: new Date("2026-01-01"),
      performances: [
        {
          id: 4,
          concertId: 4,
          startsAt: new Date("2099-01-01"),
          bookingOpensAt: new Date("2000-01-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 300,
          bookedSeats: 100,
        },
      ],
    },
  ],
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();
  return { ...actual, useDailyRankings: () => ({ data: mockConcerts }) };
});

describe("DailyRanking", () => {
  beforeEach(() => {
    render(<DailyRanking />);
  });

  it("섹션 제목을 렌더링한다", () => {
    expect(screen.getByText("일간 랭킹")).toBeInTheDocument();
  });

  it("모든 공연 제목을 렌더링한다", () => {
    for (const { title } of mockConcerts) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("순위 번호를 렌더링한다", () => {
    mockConcerts.forEach((_, i) => {
      expect(screen.getByText(String(i + 1))).toBeInTheDocument();
    });
  });

  it("예매 중 상태 배지를 렌더링한다", () => {
    expect(screen.getAllByText("예매 중").length).toBeGreaterThan(0);
  });

  it("오픈 예정 상태 배지를 렌더링한다", () => {
    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
  });

  it("매진 상태 배지를 렌더링한다", () => {
    expect(screen.getByText("매진")).toBeInTheDocument();
  });

  it("전체보기 버튼을 클릭할 수 있다", async () => {
    await userEvent.click(screen.getByRole("button", { name: "전체보기" }));
  });
});
