import { useEffect, useId, useState } from "react";

import {
  type TossPaymentsWidgets,
  type WidgetAgreementWidget,
  type WidgetPaymentMethodWidget,
  loadTossPayments,
} from "@tosspayments/tosspayments-sdk";

import type { User } from "@entities/session";

import { PAYMENT_ROUTES } from "../model/payment.constants";
import type { PaymentOrder } from "../model/payment.types";
import { formatPaymentAmount, getPaymentCustomerKey } from "../model/payment.utils";

interface TossPaymentWidgetProps {
  order: PaymentOrder;
  user: User;
}

const TossPaymentWidget = ({ order, user }: TossPaymentWidgetProps) => {
  const widgetId = useId().replaceAll(":", "");
  const paymentMethodSelector = `payment-method-${widgetId}`;
  const agreementSelector = `payment-agreement-${widgetId}`;
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isExpired, setIsExpired] = useState(() => new Date(order.paymentExpiresAt).getTime() <= Date.now());

  useEffect(() => {
    const expiresAt = new Date(order.paymentExpiresAt).getTime();

    if (!Number.isFinite(expiresAt)) {
      setIsExpired(true);
      return;
    }

    const updateExpiration = () => setIsExpired(expiresAt <= Date.now());
    updateExpiration();

    const timeoutId = window.setTimeout(updateExpiration, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [order.paymentExpiresAt]);

  useEffect(() => {
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

    if (!clientKey) {
      setErrorMessage("Toss 클라이언트 키가 설정되지 않았습니다.");
      return;
    }

    let isUnmounted = false;
    let paymentMethodWidget: WidgetPaymentMethodWidget | null = null;
    let agreementWidget: WidgetAgreementWidget | null = null;

    const renderWidgets = async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);

        if (isUnmounted) {
          return;
        }

        const nextWidgets = tossPayments.widgets({ customerKey: getPaymentCustomerKey(user.id) });

        await nextWidgets.setAmount({ currency: "KRW", value: order.amount });

        if (isUnmounted) {
          return;
        }

        paymentMethodWidget = await nextWidgets.renderPaymentMethods({ selector: `#${paymentMethodSelector}` });

        if (isUnmounted) {
          void paymentMethodWidget.destroy();
          return;
        }

        agreementWidget = await nextWidgets.renderAgreement({ selector: `#${agreementSelector}` });

        if (!isUnmounted) {
          setWidgets(nextWidgets);
          setErrorMessage(null);
          return;
        }

        void paymentMethodWidget.destroy();
        void agreementWidget.destroy();
      } catch {
        if (isUnmounted) {
          return;
        }

        void paymentMethodWidget?.destroy();
        void agreementWidget?.destroy();
        setErrorMessage("결제수단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    };

    void renderWidgets();

    return () => {
      isUnmounted = true;
      void paymentMethodWidget?.destroy();
      void agreementWidget?.destroy();
    };
  }, [agreementSelector, order.amount, paymentMethodSelector, user.id]);

  const handlePaymentRequest = async (paymentWidgets: TossPaymentsWidgets) => {
    setIsRequesting(true);

    try {
      const origin = window.location.origin;
      const failUrl = new URL(PAYMENT_ROUTES.fail, origin);
      failUrl.searchParams.set("reservationId", String(order.reservationId));

      await paymentWidgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: new URL(PAYMENT_ROUTES.success, origin).toString(),
        failUrl: failUrl.toString(),
        customerEmail: user.email,
        customerName: user.nickname,
      });
    } catch {
      setErrorMessage("결제를 시작하지 못했습니다. 결제수단과 약관 동의 상태를 확인해 주세요.");
      setIsRequesting(false);
    }
  };

  return (
    <section aria-labelledby="payment-method-title" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
        <h2 id="payment-method-title" className="font-bold text-gray-900">
          결제수단
        </h2>
      </div>
      <div className="min-h-40" id={paymentMethodSelector} />
      <div className="border-t border-gray-100" id={agreementSelector} />
      {(isExpired || errorMessage) && (
        <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-600 sm:px-7">
          {isExpired ? "결제 가능 시간이 만료되었습니다." : errorMessage}
        </p>
      )}
      <div className="sticky bottom-0 mt-5 border-t border-gray-200 bg-white/95 p-4 backdrop-blur sm:static sm:px-7 sm:py-5">
        <button
          type="button"
          onClick={widgets && !isExpired ? () => void handlePaymentRequest(widgets) : undefined}
          disabled={!widgets || isRequesting || isExpired}
          className="bg-brand-primary w-full rounded-xl px-5 py-4 text-base font-bold text-white transition hover:bg-violet-700 disabled:bg-gray-300"
        >
          {isRequesting ? "결제창을 여는 중..." : `${formatPaymentAmount(order.amount)} 결제하기`}
        </button>
      </div>
    </section>
  );
};

export default TossPaymentWidget;
