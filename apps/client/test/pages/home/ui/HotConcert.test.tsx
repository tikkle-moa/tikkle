import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HotConcert from "@pages/home/ui/HotConcert";

const { mockUseHotConcerts, mockConcerts } = vi.hoisted(() => ({
  mockUseHotConcerts: vi.fn(),
  mockConcerts: [
    {
      concert: {
        id: 1,
        title: "테스트 콘서트 1",
        genre: "BALLAD" as const,
        placeName: "올림픽공원",
        posterUrl: "https://example.com/1.jpg",
        description: null,
        createdAt: new Date("2026-01-01").toISOString(),
      },
      performances: [
        {
          id: 1,
          concertId: 1,
          startsAt: new Date("2099-01-01").toISOString(),
          bookingOpensAt: new Date("2000-01-01").toISOString(),
          createdAt: new Date("2026-01-01").toISOString(),
        },
      ],
    },
    {
      concert: {
        id: 2,
        title: "테스트 콘서트 2",
        genre: "ROCK_METAL" as const,
        placeName: "잠실실내체육관",
        posterUrl: "https://example.com/2.jpg",
        description: null,
        createdAt: new Date("2026-01-01").toISOString(),
      },
      performances: [
        {
          id: 2,
          concertId: 2,
          startsAt: new Date("2099-01-01").toISOString(),
          bookingOpensAt: new Date("2099-01-01").toISOString(),
          createdAt: new Date("2026-01-01").toISOString(),
        },
      ],
    },
  ],
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();
  return { ...actual, useHotConcerts: mockUseHotConcerts };
});

describe("HotConcert", () => {
  describe("정상 상태", () => {
    beforeEach(() => {
      mockUseHotConcerts.mockReturnValue({ data: mockConcerts, isPending: false, isError: false });
      render(<HotConcert />);
    });

    it("섹션 제목을 렌더링한다", () => {
      expect(screen.getByText("지금 HOT한 공연")).toBeInTheDocument();
    });

    it("모든 공연 제목을 렌더링한다", () => {
      for (const {
        concert: { title },
      } of mockConcerts) {
        expect(screen.getByText(title)).toBeInTheDocument();
      }
    });

    it("전체보기 버튼을 클릭할 수 있다", async () => {
      await userEvent.click(screen.getByRole("button", { name: "전체보기" }));
    });
  });

  it("로딩 중이면 스켈레튼을 렌더링한다", () => {
    mockUseHotConcerts.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const { container } = render(<HotConcert />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText(mockConcerts[0].concert.title)).not.toBeInTheDocument();
  });

  it("에러 상태이면 에러 메시지를 렌더링한다", () => {
    mockUseHotConcerts.mockReturnValue({ data: undefined, isPending: false, isError: true });
    render(<HotConcert />);

    expect(screen.getByText("공연 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("목록이 비어 있으면 빈 상태 메시지를 렌더링한다", () => {
    mockUseHotConcerts.mockReturnValue({ data: [], isPending: false, isError: false });
    render(<HotConcert />);

    expect(screen.getByText("HOT한 공연이 없습니다.")).toBeInTheDocument();
  });
});
