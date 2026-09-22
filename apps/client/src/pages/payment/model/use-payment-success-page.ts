import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { usePaymentResult } from "@features/payment";
import type { PaymentResultRequest } from "@features/payment";

import { toPositiveAmount } from "./payment.utils";

export const usePaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const request = useMemo(() => {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = toPositiveAmount(searchParams.get("amount"));

    if (!paymentKey || !orderId || amount === null) {
      return null;
    }

    return {
      action: "CONFIRM_PAYMENT",
      data: { paymentKey, orderId, amount },
    } satisfies PaymentResultRequest;
  }, [searchParams]);

  return { isRequestValid: request !== null, ...usePaymentResult({ request }) };
};
