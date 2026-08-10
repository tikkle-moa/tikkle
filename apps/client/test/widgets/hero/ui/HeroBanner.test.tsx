import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import HeroBanner from "@widgets/hero/ui/HeroBanner";

const renderHeroBanner = () =>
  render(
    <MemoryRouter>
      <HeroBanner />
    </MemoryRouter>,
  );

describe("HeroBanner", () => {
  it("서비스 뱃지를 렌더링한다", () => {
    renderHeroBanner();
    expect(screen.getByText("그룹 콘서트 예매 서비스")).toBeInTheDocument();
  });

  it("메인 헤드라인을 렌더링한다", () => {
    renderHeroBanner();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("모두가 같은 화면에서");
  });

  it("CTA 링크를 렌더링한다", () => {
    renderHeroBanner();
    expect(screen.getByRole("link", { name: "콘서트 보러가기" })).toBeInTheDocument();
  });

  it("CTA 링크가 콘서트 페이지(/concerts)를 가리킨다", () => {
    renderHeroBanner();
    expect(screen.getByRole("link", { name: "콘서트 보러가기" })).toHaveAttribute("href", "/concerts");
  });
});
