import { MemoryRouter, useLocation } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CONCERT_GENRE_MAP } from "@entities/concert";

import DailyRanking from "@pages/home/ui/DailyRanking";

const { mockUseDailyRankings, mockConcerts } = vi.hoisted(() => ({
  mockUseDailyRankings: vi.fn(),
  mockConcerts: [
    {
      id: 1,
      title: "랭킹 콘서트 1",
      genre: "BALLAD" as const,
      venueId: 1,
      venueName: "올림픽공원",
      posterUrl: "https://example.com/1.jpg",
      createdAt: new Date("2026-01-01").toISOString(),
    },
    {
      id: 2,
      title: "랭킹 콘서트 2",
      genre: "ROCK_METAL" as const,
      venueId: 2,
      venueName: "잠실실내체육관",
      posterUrl: "https://example.com/2.jpg",
      createdAt: new Date("2026-01-01").toISOString(),
    },
    {
      id: 3,
      title: "랭킹 콘서트 3",
      genre: "FESTIVAL" as const,
      venueId: 3,
      venueName: "고척스카이돔",
      posterUrl: "https://example.com/3.jpg",
      createdAt: new Date("2026-01-01").toISOString(),
    },
    {
      id: 4,
      title: "랭킹 콘서트 4",
      genre: "INDIE" as const,
      venueId: 4,
      venueName: "블루스퀘어",
      posterUrl: "https://example.com/4.jpg",
      createdAt: new Date("2026-01-01").toISOString(),
    },
  ],
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();
  return { ...actual, useDailyRankings: mockUseDailyRankings };
});

const LocationDisplay = () => <span data-testid="location">{useLocation().pathname}</span>;

describe("DailyRanking", () => {
  describe("정상 상태", () => {
    beforeEach(() => {
      mockUseDailyRankings.mockReturnValue({ data: mockConcerts, isPending: false, isError: false });
      render(
        <MemoryRouter>
          <DailyRanking />
          <LocationDisplay />
        </MemoryRouter>,
      );
    });

    it("섹션 제목을 렌더링한다", () => {
      expect(screen.getByRole("heading", { name: "일간 랭킹" })).toBeInTheDocument();
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

    it("genre 배지를 렌더링한다", () => {
      expect(screen.getAllByText(CONCERT_GENRE_MAP[mockConcerts[0].genre].label).length).toBeGreaterThan(0);
    });

    it("전체보기 버튼을 클릭할 수 있다", async () => {
      await userEvent.click(screen.getByRole("button", { name: "전체보기" }));
    });

    it("공연 카드를 클릭하면 상세 페이지로 이동한다", async () => {
      await userEvent.click(screen.getByRole("link", { name: `${mockConcerts[0].title} 상세 보기` }));

      expect(screen.getByTestId("location")).toHaveTextContent(`/concerts/${mockConcerts[0].id}`);
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
