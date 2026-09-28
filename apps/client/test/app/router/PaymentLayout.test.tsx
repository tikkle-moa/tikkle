import { RouterProvider, createMemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";

import PaymentLayout from "@app/router/PaymentLayout";

describe("PaymentLayout", () => {
  it("결제 페이지를 스크롤 가능한 레이아웃 안에 렌더링한다", () => {
    const router = createMemoryRouter(
      [
        {
          element: <PaymentLayout />,
          children: [{ path: "/", element: <div data-testid="payment-child">결제 페이지</div> }],
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("payment-child").parentElement).toHaveClass("min-h-screen");
  });
});
