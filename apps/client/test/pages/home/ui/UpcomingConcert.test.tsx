import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UpcomingConcert from "@pages/home/ui/UpcomingConcert";

const { mockConcerts } = vi.hoisted(() => ({
  mockConcerts: [
    {
      id: 1,
      title: "오픈 예정 콘서트 1",
      genre: "festival" as const,
      placeName: "올림픽공원",
      posterUrl: "https://example.com/1.jpg",
      createdAt: new Date("2026-01-01"),
      // bookingOpensAt이 미래 → upcoming 상태
      performances: [
        {
          id: 1,
          concertId: 1,
          startsAt: new Date("2099-01-01"),
          bookingOpensAt: new Date("2099-01-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 100,
          bookedSeats: 0,
        },
      ],
    },
    {
      id: 2,
      title: "오픈 예정 콘서트 2",
      genre: "indie" as const,
      placeName: "블루스퀘어",
      posterUrl: "https://example.com/2.jpg",
      createdAt: new Date("2026-01-01"),
      performances: [
        {
          id: 2,
          concertId: 2,
          startsAt: new Date("2099-01-01"),
          bookingOpensAt: new Date("2099-06-01"),
          createdAt: new Date("2026-01-01"),
          totalSeats: 300,
          bookedSeats: 0,
        },
      ],
    },
  ],
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();
  return { ...actual, useUpcomingConcerts: () => ({ data: mockConcerts }) };
});

describe("UpcomingConcert", () => {
  beforeEach(() => {
    render(<UpcomingConcert />);
  });

  it("섹션 제목을 렌더링한다", () => {
    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
  });

  it("모든 공연 제목을 렌더링한다", () => {
    for (const { title } of mockConcerts) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("모든 공연장을 렌더링한다", () => {
    for (const { placeName } of mockConcerts) {
      expect(screen.getByText(placeName)).toBeInTheDocument();
    }
  });

  it("전체보기 버튼을 클릭할 수 있다", async () => {
    await userEvent.click(screen.getByRole("button", { name: "전체보기" }));
  });
});
