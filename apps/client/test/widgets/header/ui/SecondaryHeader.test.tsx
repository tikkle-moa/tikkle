import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import SecondaryHeader from "@widgets/header/ui/SecondaryHeader";

const renderSecondaryHeader = (initialEntry: string) => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SecondaryHeader />
    </MemoryRouter>,
  );
};

describe("SecondaryHeader", () => {
  it("홈 경로에서는 홈 탭을 활성 상태로 표시한다", () => {
    renderSecondaryHeader(ROUTE_PATHS.HOME);

    expect(screen.getByRole("link", { name: "홈" })).toHaveClass("text-brand-primary");
    expect(screen.getByRole("link", { name: "콘서트" })).toHaveClass("text-gray-600");
  });

  it("콘서트 경로에서는 콘서트 탭을 활성 상태로 표시한다", () => {
    renderSecondaryHeader(ROUTE_PATHS.CONCERT_LIST);

    expect(screen.getByRole("link", { name: "홈" })).toHaveClass("text-gray-600");
    expect(screen.getByRole("link", { name: "콘서트" })).toHaveClass("text-brand-primary");
  });

  it("공연장 경로에서는 공연장 탭을 활성 상태로 표시한다", () => {
    renderSecondaryHeader(ROUTE_PATHS.VENUE_LIST);

    expect(screen.getByRole("link", { name: "홈" })).toHaveClass("text-gray-600");
    expect(screen.getByRole("link", { name: "콘서트" })).toHaveClass("text-gray-600");
    expect(screen.getByRole("link", { name: "공연장" })).toHaveClass("text-brand-primary");
  });
});
