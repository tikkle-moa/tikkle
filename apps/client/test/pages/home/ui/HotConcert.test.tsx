import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HotConcert from "@pages/home/ui/HotConcert";

const { mockConcerts } = vi.hoisted(() => ({
  mockConcerts: [
    {
      id: 1,
      title: "테스트 콘서트 1",
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
      title: "테스트 콘서트 2",
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
  ],
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();
  return { ...actual, useHotConcerts: () => ({ data: mockConcerts }) };
});

describe("HotConcert", () => {
  beforeEach(() => {
    render(<HotConcert />);
  });

  it("섹션 제목을 렌더링한다", () => {
    expect(screen.getByText("지금 HOT한 공연")).toBeInTheDocument();
  });

  it("모든 공연 제목을 렌더링한다", () => {
    for (const { title } of mockConcerts) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("전체보기 버튼을 클릭할 수 있다", async () => {
    await userEvent.click(screen.getByRole("button", { name: "전체보기" }));
  });
});
