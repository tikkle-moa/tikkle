import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UpcomingConcert from "@pages/home/ui/UpcomingConcert";

const { mockUseUpcomingConcerts, mockConcerts } = vi.hoisted(() => ({
  mockUseUpcomingConcerts: vi.fn(),
  mockConcerts: [
    {
      id: 1,
      title: "오픈 예정 콘서트 1",
      genre: "FESTIVAL" as const,
      placeName: "올림픽공원",
      posterUrl: "https://example.com/1.jpg",
      description: null,
      createdAt: new Date("2026-01-01").toISOString(),
    },
    {
      id: 2,
      title: "오픈 예정 콘서트 2",
      genre: "INDIE" as const,
      placeName: "블루스퀘어",
      posterUrl: "https://example.com/2.jpg",
      description: null,
      createdAt: new Date("2026-01-01").toISOString(),
    },
  ],
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();
  return { ...actual, useUpcomingConcerts: mockUseUpcomingConcerts };
});

describe("UpcomingConcert", () => {
  describe("정상 상태", () => {
    beforeEach(() => {
      mockUseUpcomingConcerts.mockReturnValue({ data: mockConcerts, isPending: false, isError: false });
      render(<UpcomingConcert />);
    });

    it("섹션 제목을 렌더링한다", () => {
      expect(screen.getByRole("heading", { name: "오픈 예정" })).toBeInTheDocument();
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

  it("로딩 중이면 스켈레튼을 렌더링한다", () => {
    mockUseUpcomingConcerts.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const { container } = render(<UpcomingConcert />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText(mockConcerts[0].title)).not.toBeInTheDocument();
  });

  it("에러 상태이면 에러 메시지를 렌더링한다", () => {
    mockUseUpcomingConcerts.mockReturnValue({ data: undefined, isPending: false, isError: true });
    render(<UpcomingConcert />);

    expect(screen.getByText("공연 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("목록이 비어 있으면 빈 상태 메시지를 렌더링한다", () => {
    mockUseUpcomingConcerts.mockReturnValue({ data: [], isPending: false, isError: false });
    render(<UpcomingConcert />);

    expect(screen.getByText("오픈 예정 공연이 없습니다.")).toBeInTheDocument();
  });
});
