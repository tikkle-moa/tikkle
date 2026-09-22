import { renderHook } from "@testing-library/react";

import { PAYMENT_NAVIGATION_WARNING_MESSAGE } from "@features/payment/model/payment.constants";
import { usePaymentNavigationGuard } from "@features/payment/model/use-payment-navigation-guard";

const usePrompt = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({ unstable_usePrompt: usePrompt }));

describe("usePaymentNavigationGuard", () => {
  beforeEach(() => {
    usePrompt.mockReset();
  });

  it("결제 화면에서 허용되지 않은 경로로 이동할 때 경고하도록 등록한다", () => {
    renderHook(() => usePaymentNavigationGuard({ enabled: true, allowedPathnames: ["/payments/501"] }));

    const options = usePrompt.mock.calls[0][0] as {
      message: string;
      when: (props: { nextLocation: { pathname: string } }) => boolean;
    };

    expect(options.message).toBe(PAYMENT_NAVIGATION_WARNING_MESSAGE);
    expect(options.when({ nextLocation: { pathname: "/performances/10/checkout" } })).toBe(true);
    expect(options.when({ nextLocation: { pathname: "/payments/501" } })).toBe(false);
  });

  it("비활성화되면 경로와 관계없이 이동을 막지 않는다", () => {
    renderHook(() => usePaymentNavigationGuard({ enabled: false }));

    const options = usePrompt.mock.calls[0][0] as {
      when: (props: { nextLocation: { pathname: string } }) => boolean;
    };

    expect(options.when({ nextLocation: { pathname: "/performances/10" } })).toBe(false);
  });
});
