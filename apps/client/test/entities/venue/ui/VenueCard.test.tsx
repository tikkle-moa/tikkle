import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { VenueCard, VenueCardSkeleton } from "@entities/venue";

const venue = {
  id: 7,
  name: "티클 아레나",
  address: "서울특별시 송파구",
  description: null,
  width: 100,
  height: 80,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 20,
  stageHeight: 5,
  venueSeatCount: 1234,
  concertCount: 12,
  createdAt: "2026-09-01T00:00:00",
};

describe("VenueCard", () => {
  it("공연장 정보와 상세 및 지도 링크를 표시한다", () => {
    render(<VenueCard venue={venue} />, { wrapper: MemoryRouter });

    expect(screen.getByText("티클 아레나")).toBeInTheDocument();
    expect(screen.getByText("1,234석")).toBeInTheDocument();
    expect(screen.getByText("12개")).toBeInTheDocument();
    expect(screen.getByText("100 × 80")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "티클 아레나 상세 보기" })).toHaveAttribute("href", "/venues/7");
    expect(screen.getByRole("link", { name: /네이버 지도로 보기/ })).toHaveAttribute(
      "href",
      `https://map.naver.com/p/search/${encodeURIComponent(venue.address)}`,
    );
  });
});

describe("VenueCardSkeleton", () => {
  it("실제 카드 크기에 대응하는 로딩 UI를 표시한다", () => {
    const { container } = render(<VenueCardSkeleton />);

    expect(container.firstChild).toHaveClass("h-full", "animate-pulse", "p-5", "gap-3");
  });
});
