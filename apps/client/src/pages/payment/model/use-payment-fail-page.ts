import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { usePaymentResult } from "@features/payment";
import type { PaymentResultCommand } from "@features/payment";

export const usePaymentFailPage = () => {
  const [searchParams] = useSearchParams();
  const request = useMemo(() => {
    const reservationId = Number(searchParams.get("reservationId"));

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return null;
    }

    return {
      action: "CANCEL_PAYMENT",
      data: { reservationId },
    } satisfies PaymentResultCommand;
  }, [searchParams]);

  return { isRequestValid: request !== null, ...usePaymentResult({ request }) };
};
