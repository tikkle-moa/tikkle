import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import AppLayout from "@app/router/AppLayout";

vi.mock("@widgets/header", () => ({
  Header: () => <header>공통 헤더</header>,
}));

const makeRouter = () =>
  createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [{ path: "/", element: <div>페이지 콘텐츠</div> }],
      },
    ],
    { initialEntries: ["/"] },
  );

describe("AppLayout", () => {
  it("공통 헤더와 현재 페이지 콘텐츠를 렌더링한다", () => {
    render(<RouterProvider router={makeRouter()} />);

    expect(screen.getByText("공통 헤더")).toBeInTheDocument();

    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByText("페이지 콘텐츠"));
  });
});
