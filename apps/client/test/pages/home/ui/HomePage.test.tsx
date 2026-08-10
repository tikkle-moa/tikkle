import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import HomePage from "@pages/home/ui/HomePage";

vi.mock("@features/content-slider", () => ({
  ContentSlider: () => <div data-testid="content-slider" />,
}));

const renderHomePage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

describe("HomePage", () => {
  it("오픈 예정 섹션을 렌더링한다", () => {
    renderHomePage();
    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
  });

  it("일간 랭킹 섹션을 렌더링한다", () => {
    renderHomePage();
    expect(screen.getByText("일간 랭킹")).toBeInTheDocument();
  });

  it("HOT 공연 섹션을 렌더링한다", () => {
    renderHomePage();
    expect(screen.getByText("지금 HOT한 공연")).toBeInTheDocument();
  });
});
