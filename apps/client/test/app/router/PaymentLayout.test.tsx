import { render, screen } from "@testing-library/react";

import PaymentLayout from "@app/router/PaymentLayout";

vi.mock("react-router", () => ({
  Outlet: () => <div>결제 페이지</div>,
}));

describe("PaymentLayout", () => {
  it("결제 outlet을 렌더링한다", () => {
    render(<PaymentLayout />);

    expect(screen.getByText("결제 페이지")).toBeInTheDocument();
  });
});
