import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import MobileBottomNavigation from "@widgets/mobile-navigation/ui/MobileBottomNavigation";

describe("MobileBottomNavigation", () => {
  it("홈, 검색, 마이 탭을 표시한다", () => {
    render(
      <MemoryRouter>
        <MobileBottomNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", ROUTE_PATHS.HOME);
    expect(screen.getByRole("link", { name: "검색" })).toHaveAttribute("href", ROUTE_PATHS.SEARCH);
    expect(screen.getByRole("link", { name: "마이" })).toHaveAttribute("href", ROUTE_PATHS.MY);
  });

  it("홈 경로에서는 홈 탭을 활성 상태로 표시한다", () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.HOME]}>
        <MobileBottomNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "홈" })).toHaveClass("text-brand-primary");
  });

  it("검색 경로에서는 검색 탭을 활성 상태로 표시한다", () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.SEARCH]}>
        <MobileBottomNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "검색" })).toHaveClass("text-brand-primary");
  });

  it("마이 경로에서는 마이 탭을 활성 상태로 표시한다", () => {
    render(
      <MemoryRouter initialEntries={[ROUTE_PATHS.MY]}>
        <MobileBottomNavigation />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "마이" })).toHaveClass("text-brand-primary");
  });
});
