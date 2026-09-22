import { renderHook } from "@testing-library/react";

import { PAYMENT_NAVIGATION_WARNING_MESSAGE } from "@features/payment/model/payment.constants";
import { usePaymentNavigationGuard } from "@features/payment/model/use-payment-navigation-guard";

const useBlocker = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({ useBlocker }));

describe("usePaymentNavigationGuard", () => {
  beforeEach(() => {
    useBlocker.mockReset();
    useBlocker.mockReturnValue({ state: "idle", proceed: vi.fn(), reset: vi.fn() });
  });

  it("결제 화면에서 허용되지 않은 경로로 이동할 때 경고하도록 등록한다", () => {
    const proceed = vi.fn();
    const reset = vi.fn();
    useBlocker.mockReturnValue({ state: "blocked", proceed, reset });
    const { result } = renderHook(() => usePaymentNavigationGuard({ enabled: true, allowedPathnames: ["/payments/501"] }));

    const options = useBlocker.mock.calls[0][0] as (props: { nextLocation: { pathname: string } }) => boolean;

    expect(result.current).toEqual({ isBlocked: true, message: PAYMENT_NAVIGATION_WARNING_MESSAGE, proceed, reset });
    expect(options({ nextLocation: { pathname: "/performances/10/checkout" } })).toBe(true);
    expect(options({ nextLocation: { pathname: "/payments/501" } })).toBe(false);
  });

  it("비활성화되면 경로와 관계없이 이동을 막지 않는다", () => {
    const { result } = renderHook(() => usePaymentNavigationGuard({ enabled: false }));

    const options = useBlocker.mock.calls[0][0] as (props: { nextLocation: { pathname: string } }) => boolean;

    expect(result.current.isBlocked).toBe(false);
    expect(options({ nextLocation: { pathname: "/performances/10" } })).toBe(false);
  });
});
