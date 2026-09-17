import { useCallback, useEffect, useId, useState } from "react";

import type { PaymentOrderMessageData } from "@tikkle/api-types";
import {
  type TossPaymentsWidgets,
  type WidgetAgreementWidget,
  type WidgetPaymentMethodWidget,
  loadTossPayments,
} from "@tosspayments/tosspayments-sdk";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { User } from "@entities/session";

import { getPaymentCustomerKey } from "./payment.utils";

interface UseTossPaymentWidgetProps {
  order: PaymentOrderMessageData;
  user: User;
}

export const useTossPaymentWidget = ({ order, user }: UseTossPaymentWidgetProps) => {
  const widgetId = useId().replaceAll(":", "");
  const paymentMethodSelector = `payment-method-${widgetId}`;
  const agreementSelector = `payment-agreement-${widgetId}`;
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [expirationState, setExpirationState] = useState(() => {
    const expiresAt = new Date(order.paymentExpiresAt).getTime();
    return {
      paymentExpiresAt: order.paymentExpiresAt,
      isExpired: !Number.isFinite(expiresAt) || expiresAt <= Date.now(),
    };
  });
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
  const expiresAt = new Date(order.paymentExpiresAt).getTime();
  const isExpired = !Number.isFinite(expiresAt) || (expirationState.paymentExpiresAt === order.paymentExpiresAt && expirationState.isExpired);
  const displayedErrorMessage = clientKey ? errorMessage : "Toss 클라이언트 키가 설정되지 않았습니다.";

  useEffect(() => {
    if (!Number.isFinite(expiresAt)) {
      return;
    }

    const remainingMilliseconds = expiresAt - Date.now();

    if (remainingMilliseconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExpirationState({ paymentExpiresAt: order.paymentExpiresAt, isExpired: true });
    }, remainingMilliseconds);
    return () => window.clearTimeout(timeoutId);
  }, [expiresAt, order.paymentExpiresAt]);

  useEffect(() => {
    if (!clientKey || isExpired) {
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
  }, [agreementSelector, clientKey, isExpired, order.amount, paymentMethodSelector, user.id]);

  const handlePaymentRequest = useCallback(async () => {
    if (!widgets || isExpired) {
      return;
    }

    setIsRequesting(true);

    try {
      const origin = window.location.origin;
      const failUrl = new URL(ROUTE_PATHS.PAYMENT_FAIL, origin);
      failUrl.searchParams.set("reservationId", String(order.reservationId));

      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: new URL(ROUTE_PATHS.PAYMENT_SUCCESS, origin).toString(),
        failUrl: failUrl.toString(),
        customerEmail: user.email,
        customerName: user.nickname,
      });
    } catch {
      setErrorMessage("결제를 시작하지 못했습니다. 결제수단과 약관 동의 상태를 확인해 주세요.");
      setIsRequesting(false);
    }
  }, [isExpired, order.orderId, order.orderName, order.reservationId, user.email, user.nickname, widgets]);

  return {
    agreementSelector,
    displayedErrorMessage,
    handlePaymentRequest,
    isExpired,
    isRequesting,
    paymentMethodSelector,
    widgets,
  };
};
