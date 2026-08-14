import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ROUTE_PATHS } from "@shared/config/router.config";

import ReservationPage from "@pages/my/ui/ReservationPage";

const renderReservationPage = () => {
  const router = createMemoryRouter(
    [
      { path: ROUTE_PATHS.MY, element: <p>마이 페이지</p> },
      { path: ROUTE_PATHS.MY_RESERVATIONS, element: <ReservationPage /> },
    ],
    {
      initialEntries: [ROUTE_PATHS.MY, ROUTE_PATHS.MY_RESERVATIONS],
      initialIndex: 1,
    },
  );

  render(<RouterProvider router={router} />);
};

describe("ReservationPage", () => {
  it("내 예약 페이지를 표시한다", () => {
    renderReservationPage();

    expect(screen.getByRole("heading", { name: "내 예약" })).toBeInTheDocument();
    expect(screen.getByText("내 예약 목록을 준비하고 있어요.")).toBeInTheDocument();
  });

  it("뒤로가기 버튼을 누르면 이전 마이 페이지로 이동한다", async () => {
    const user = userEvent.setup();

    renderReservationPage();

    await user.click(screen.getByRole("button", { name: "이전 페이지로 돌아가기" }));

    expect(await screen.findByText("마이 페이지")).toBeInTheDocument();
  });
});
