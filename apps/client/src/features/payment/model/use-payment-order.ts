import { useCallback, useEffect, useRef, useState } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";
import { useStompSubscription } from "@shared/realtime/use-stomp-subscription";

import { PAYMENT_STOMP_DESTINATIONS, isPaymentUiFixtureEnabled } from "./payment.constants";
import { createPaymentOrderFixture } from "./payment.fixtures";
import type { PaymentOrder } from "./payment.types";
import { isPaymentOrder, parsePaymentCommandResponse } from "./payment.utils";

interface UsePaymentOrderResult {
  order: PaymentOrder | null;
  errorMessage: string | null;
  isLoading: boolean;
  isFixture: boolean;
}

export const usePaymentOrder = (reservationId: number): UsePaymentOrderResult => {
  const client = useStompStore((state) => state.client);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getClient = useStompStore((state) => state.getClient);
  const requestIdRef = useRef<string | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isReservationIdValid = Number.isInteger(reservationId) && reservationId > 0;

  useEffect(() => {
    if (isPaymentUiFixtureEnabled) {
      return;
    }

    getClient();
  }, [getClient]);

  const handleMessage = useCallback((message: { body: string }) => {
    const response = parsePaymentCommandResponse(message.body);

    if (!response || response.requestId !== requestIdRef.current || response.action !== "GET_PAYMENT_ORDER") {
      return;
    }

    if (!response.success) {
      setErrorMessage(response.error?.message ?? "결제 주문서를 불러오지 못했습니다.");
      setIsLoading(false);
      return;
    }

    if (!isPaymentOrder(response.data)) {
      setErrorMessage("결제 주문서 형식이 올바르지 않습니다.");
      setIsLoading(false);
      return;
    }

    setOrder(response.data);
    setErrorMessage(null);
    setIsLoading(false);
  }, []);

  useStompSubscription({
    destination: PAYMENT_STOMP_DESTINATIONS.response,
    onMessage: handleMessage,
    enabled: isReservationIdValid && !isPaymentUiFixtureEnabled,
  });

  useEffect(() => {
    if (!isReservationIdValid) {
      setErrorMessage("올바르지 않은 결제 주문입니다.");
      setIsLoading(false);
      return;
    }

    if (isPaymentUiFixtureEnabled) {
      setOrder(createPaymentOrderFixture(reservationId));
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    if (!client || connectionStatus !== "connected" || !client.connected) {
      return;
    }

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    setIsLoading(true);

    client.publish({
      destination: PAYMENT_STOMP_DESTINATIONS.request,
      body: JSON.stringify({
        requestId,
        action: "GET_PAYMENT_ORDER",
        data: { reservationId },
      }),
    });
  }, [client, connectionStatus, isReservationIdValid, reservationId]);

  return { order, errorMessage, isLoading, isFixture: isPaymentUiFixtureEnabled };
};
