import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DailyRanking from "@pages/home/ui/DailyRanking";

const { mockUseDailyRankings, mockConcerts } = vi.hoisted(() => ({
  mockUseDailyRankings: vi.fn(),
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
  return { ...actual, useDailyRankings: mockUseDailyRankings };
});

describe("DailyRanking", () => {
  describe("정상 상태", () => {
    beforeEach(() => {
      mockUseDailyRankings.mockReturnValue({ data: mockConcerts, isPending: false, isError: false });
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

  it("로딩 중이면 스켈레톤을 렌더링한다", () => {
    mockUseDailyRankings.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const { container } = render(<DailyRanking />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText(mockConcerts[0].title)).not.toBeInTheDocument();
  });

  it("에러 상태이면 에러 메시지를 렌더링한다", () => {
    mockUseDailyRankings.mockReturnValue({ data: undefined, isPending: false, isError: true });
    render(<DailyRanking />);

    expect(screen.getByText("랭킹 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("목록이 비어 있으면 빈 상태 메시지를 렌더링한다", () => {
    mockUseDailyRankings.mockReturnValue({ data: [], isPending: false, isError: false });
    render(<DailyRanking />);

    expect(screen.getByText("랭킹 데이터가 없습니다.")).toBeInTheDocument();
  });
});
