import { StrictMode } from "react";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

import TossPaymentWidget from "@features/payment/ui/TossPaymentWidget";

vi.mock("@tosspayments/tosspayments-sdk", () => ({
  loadTossPayments: vi.fn(),
}));

const order = {
  reservationId: 501,
  orderId: "tikkle-fixture-501",
  orderName: "2026 Summer Festival 2석",
  amount: 300_000,
  paymentExpiresAt: "2026-09-11T23:30:00",
  concertTitle: "2026 Summer Festival",
  performanceName: "2026 Summer Festival 1회차",
  performanceStartsAt: "2026-08-20T19:00:00",
  venueName: "올림픽공원 KSPO DOME",
  seats: [
    { venueSeatId: 101, sectionName: "A구역", seatLabel: "A구역 1열 1번", price: 150_000 },
    { venueSeatId: 102, sectionName: "A구역", seatLabel: "A구역 1열 2번", price: 150_000 },
  ],
};

const user = {
  id: 1,
  email: "user@example.com",
  nickname: "티클 사용자",
  profileImageUrl: null,
  role: "USER" as const,
  oauthAccounts: [],
};

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
};

describe("TossPaymentWidget", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_TOSS_CLIENT_KEY", "test_gck_docs_fixture");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("결제수단과 테스트 결제 버튼을 렌더링한다", async () => {
    const widgets = {
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      renderAgreement: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      requestPayment: vi.fn(),
    };
    vi.mocked(loadTossPayments).mockResolvedValue({
      widgets: vi.fn().mockReturnValue(widgets),
    } as never);

    render(
      <StrictMode>
        <TossPaymentWidget order={order} user={user} />
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "300,000원 결제하기" })).toBeEnabled());
    expect(loadTossPayments).toHaveBeenCalledWith("test_gck_docs_fixture");
    expect(widgets.setAmount).toHaveBeenCalledWith({ currency: "KRW", value: 300_000 });
  });

  it("Toss 클라이언트 키가 없으면 오류를 표시한다", () => {
    vi.stubEnv("VITE_TOSS_CLIENT_KEY", "");

    render(<TossPaymentWidget order={order} user={user} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Toss 클라이언트 키가 설정되지 않았습니다.");
    expect(loadTossPayments).not.toHaveBeenCalled();
  });

  it("결제 가능 시간이 지나면 결제 버튼을 비활성화한다", async () => {
    const widgets = {
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      renderAgreement: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      requestPayment: vi.fn(),
    };
    vi.mocked(loadTossPayments).mockResolvedValue({ widgets: vi.fn().mockReturnValue(widgets) } as never);

    render(<TossPaymentWidget order={{ ...order, paymentExpiresAt: "2020-01-01T00:00:00" }} user={user} />);

    expect(screen.getByRole("alert")).toHaveTextContent("결제 가능 시간이 만료되었습니다.");
    expect(screen.getByRole("button", { name: "300,000원 결제하기" })).toBeDisabled();
  });

  it("결제 가능 시간이 유효하지 않으면 만료 상태로 처리한다", () => {
    render(<TossPaymentWidget order={{ ...order, paymentExpiresAt: "invalid-date" }} user={user} />);

    expect(screen.getByRole("alert")).toHaveTextContent("결제 가능 시간이 만료되었습니다.");
    expect(screen.getByRole("button", { name: "300,000원 결제하기" })).toBeDisabled();
  });

  it("금액 설정 중 언마운트되면 이후 위젯을 렌더링하지 않는다", async () => {
    const setAmount = createDeferred<void>();
    const widgets = {
      setAmount: vi.fn().mockReturnValue(setAmount.promise),
      renderPaymentMethods: vi.fn(),
      renderAgreement: vi.fn(),
      requestPayment: vi.fn(),
    };
    vi.mocked(loadTossPayments).mockResolvedValue({ widgets: vi.fn().mockReturnValue(widgets) } as never);

    const { unmount } = render(<TossPaymentWidget order={order} user={user} />);

    await waitFor(() => expect(widgets.setAmount).toHaveBeenCalled());
    unmount();

    await act(async () => {
      setAmount.resolve(undefined);
      await setAmount.promise;
    });

    expect(widgets.renderPaymentMethods).not.toHaveBeenCalled();
  });

  it("결제수단 위젯 렌더링 중 언마운트되면 위젯을 정리한다", async () => {
    const paymentMethods = createDeferred<{ destroy: ReturnType<typeof vi.fn> }>();
    const destroy = vi.fn();
    const widgets = {
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockReturnValue(paymentMethods.promise),
      renderAgreement: vi.fn(),
      requestPayment: vi.fn(),
    };
    vi.mocked(loadTossPayments).mockResolvedValue({ widgets: vi.fn().mockReturnValue(widgets) } as never);

    const { unmount } = render(<TossPaymentWidget order={order} user={user} />);

    await waitFor(() => expect(widgets.renderPaymentMethods).toHaveBeenCalled());
    unmount();

    await act(async () => {
      paymentMethods.resolve({ destroy });
      await paymentMethods.promise;
    });

    expect(destroy).toHaveBeenCalled();
    expect(widgets.renderAgreement).not.toHaveBeenCalled();
  });

  it("약관 위젯 렌더링 중 언마운트되면 두 위젯을 정리한다", async () => {
    const agreement = createDeferred<{ destroy: ReturnType<typeof vi.fn> }>();
    const paymentMethodDestroy = vi.fn();
    const agreementDestroy = vi.fn();
    const widgets = {
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockResolvedValue({ destroy: paymentMethodDestroy }),
      renderAgreement: vi.fn().mockReturnValue(agreement.promise),
      requestPayment: vi.fn(),
    };
    vi.mocked(loadTossPayments).mockResolvedValue({ widgets: vi.fn().mockReturnValue(widgets) } as never);

    const { unmount } = render(<TossPaymentWidget order={order} user={user} />);

    await waitFor(() => expect(widgets.renderAgreement).toHaveBeenCalled());
    unmount();

    await act(async () => {
      agreement.resolve({ destroy: agreementDestroy });
      await agreement.promise;
    });

    expect(paymentMethodDestroy).toHaveBeenCalled();
    expect(agreementDestroy).toHaveBeenCalled();
  });

  it("Toss 위젯 초기화에 실패하면 오류를 표시한다", async () => {
    vi.mocked(loadTossPayments).mockRejectedValue(new Error("Toss unavailable"));

    render(<TossPaymentWidget order={order} user={user} />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("결제수단을 불러오지 못했습니다."));
  });

  it("초기화 실패 전에 언마운트되면 오류를 표시하지 않는다", async () => {
    const load = createDeferred<never>();
    vi.mocked(loadTossPayments).mockReturnValue(load.promise as never);

    const { unmount } = render(<TossPaymentWidget order={order} user={user} />);

    await waitFor(() => expect(loadTossPayments).toHaveBeenCalled());
    unmount();

    await act(async () => {
      load.reject(new Error("Toss unavailable"));
      await load.promise.catch(() => undefined);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("결제 버튼을 누르면 Toss 결제를 요청한다", async () => {
    const requestPayment = vi.fn().mockResolvedValue(undefined);
    const widgets = {
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      renderAgreement: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      requestPayment,
    };
    vi.mocked(loadTossPayments).mockResolvedValue({ widgets: vi.fn().mockReturnValue(widgets) } as never);

    render(<TossPaymentWidget order={order} user={user} />);

    const button = await screen.findByRole("button", { name: "300,000원 결제하기" });
    await waitFor(() => expect(button).toBeEnabled());
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(requestPayment).toHaveBeenCalledWith({
      orderId: order.orderId,
      orderName: order.orderName,
      successUrl: `${window.location.origin}/payments/success`,
      failUrl: `${window.location.origin}/payments/fail?reservationId=${order.reservationId}`,
      customerEmail: user.email,
      customerName: user.nickname,
    });
    expect(screen.getByRole("button", { name: "결제창을 여는 중..." })).toBeDisabled();
  });

  it("결제 요청에 실패하면 오류를 표시하고 다시 시도할 수 있다", async () => {
    const requestPayment = vi.fn().mockRejectedValue(new Error("Payment failed"));
    const widgets = {
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      renderAgreement: vi.fn().mockResolvedValue({ destroy: vi.fn() }),
      requestPayment,
    };
    vi.mocked(loadTossPayments).mockResolvedValue({ widgets: vi.fn().mockReturnValue(widgets) } as never);

    render(<TossPaymentWidget order={order} user={user} />);

    const button = await screen.findByRole("button", { name: "300,000원 결제하기" });
    await waitFor(() => expect(button).toBeEnabled());
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("결제를 시작하지 못했습니다.");
    expect(button).toBeEnabled();
  });
});
