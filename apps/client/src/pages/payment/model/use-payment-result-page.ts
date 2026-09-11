import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { usePaymentResult } from "@features/payment";
import type { PaymentResultRequest } from "@features/payment";

const toPositiveAmount = (value: string | null) => {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
};

export const usePaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const request = useMemo<PaymentResultRequest | null>(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = toPositiveAmount(searchParams.get("amount"));

    if (!paymentKey || !orderId || amount === null) {
      return null;
    }

    return {
      action: "CONFIRM_PAYMENT",
      data: { paymentKey, orderId, amount },
    };
  }, [searchParams]);

  return { isRequestValid: request !== null, ...usePaymentResult(request) };
};

export const usePaymentFailPage = () => {
  const [searchParams] = useSearchParams();
  const request = useMemo<PaymentResultRequest | null>(() => {
    const reservationId = Number(searchParams.get("reservationId"));

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return null;
    }

    return {
      action: "CANCEL_PAYMENT",
      data: { reservationId },
    };
  }, [searchParams]);

  return { isRequestValid: request !== null, ...usePaymentResult(request) };
};
