import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { CONCERT_GENRE_MAP } from "@entities/concert";

import Hero from "@widgets/hero/ui/Hero";

// Swiper는 jsdom에서 동작하지 않으므로 ContentSlider를 mock 처리
vi.mock("@features/content-slider", () => ({
  ContentSlider: ({ items }: { items: React.ReactNode[] }) => <div data-testid="content-slider">{items[0]}</div>,
}));

const renderHero = () =>
  render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );

describe("Hero", () => {
  it("ContentSlider를 렌더링한다", () => {
    renderHero();
    expect(screen.getByTestId("content-slider")).toBeInTheDocument();
  });

  it("'전체' 카테고리 링크를 렌더링한다", () => {
    renderHero();
    expect(screen.getByText("전체")).toBeInTheDocument();
  });

  it("모든 장르 카테고리 링크를 렌더링한다", () => {
    renderHero();
    for (const { label } of Object.values(CONCERT_GENRE_MAP)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("카테고리 링크들이 콘서트 페이지(/concerts)를 가리킨다", () => {
    renderHero();
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/concerts");
    }
  });
});
