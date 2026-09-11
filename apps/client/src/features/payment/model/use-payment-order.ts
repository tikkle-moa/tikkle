import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";
import { useStompSubscription } from "@shared/realtime/use-stomp-subscription";

import { PAYMENT_STOMP_DESTINATIONS } from "./payment.constants";
import { createPaymentOrderFixture } from "./payment.fixtures";
import type { PaymentOrder } from "./payment.types";
import { isPaymentOrder, parsePaymentCommandResponse } from "./payment.utils";

interface UsePaymentOrderResult {
  order: PaymentOrder | null;
  errorMessage: string | null;
  isLoading: boolean;
  isFixture: boolean;
}

interface PaymentOrderState {
  key: string;
  order: PaymentOrder | null;
  errorMessage: string | null;
  isLoading: boolean;
}

export const usePaymentOrder = (reservationId: number, fixture = false): UsePaymentOrderResult => {
  const client = useStompStore((state) => state.client);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getClient = useStompStore((state) => state.getClient);
  const requestIdRef = useRef<string | null>(null);
  const queryKey = `${reservationId}:${fixture ? "fixture" : "server"}`;
  const [paymentState, setPaymentState] = useState<PaymentOrderState>(() => ({
    key: queryKey,
    order: null,
    errorMessage: null,
    isLoading: true,
  }));
  const isReservationIdValid = Number.isInteger(reservationId) && reservationId > 0;
  const fixtureOrder = useMemo(
    () => (fixture && isReservationIdValid ? createPaymentOrderFixture(reservationId) : null),
    [fixture, isReservationIdValid, reservationId],
  );

  const visibleState = paymentState.key === queryKey ? paymentState : { key: queryKey, order: null, errorMessage: null, isLoading: true };
  const order = fixtureOrder ?? visibleState.order;
  const errorMessage = !isReservationIdValid ? "올바르지 않은 결제 주문입니다." : visibleState.errorMessage;
  const isLoading = !isReservationIdValid || fixture ? false : visibleState.isLoading;

  useEffect(() => {
    if (fixture) {
      return;
    }

    getClient();
  }, [fixture, getClient]);

  const handleMessage = useCallback(
    (message: { body: string }) => {
      const response = parsePaymentCommandResponse(message.body);

      if (!response || response.requestId !== requestIdRef.current || response.action !== "GET_PAYMENT_ORDER") {
        return;
      }

      if (!response.success) {
        setPaymentState({
          key: queryKey,
          order: null,
          errorMessage: response.error?.message ?? "결제 주문서를 불러오지 못했습니다.",
          isLoading: false,
        });
        return;
      }

      if (!isPaymentOrder(response.data)) {
        setPaymentState({
          key: queryKey,
          order: null,
          errorMessage: "결제 주문서 형식이 올바르지 않습니다.",
          isLoading: false,
        });
        return;
      }

      setPaymentState({
        key: queryKey,
        order: response.data,
        errorMessage: null,
        isLoading: false,
      });
    },
    [queryKey],
  );

  useStompSubscription({
    destination: PAYMENT_STOMP_DESTINATIONS.response,
    onMessage: handleMessage,
    enabled: isReservationIdValid && !fixture,
  });

  useEffect(() => {
    requestIdRef.current = null;

    if (!isReservationIdValid || fixture) {
      return;
    }

    if (!client || connectionStatus !== "connected" || !client.connected) {
      return;
    }

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;

    client.publish({
      destination: PAYMENT_STOMP_DESTINATIONS.request,
      body: JSON.stringify({
        requestId,
        action: "GET_PAYMENT_ORDER",
        data: { reservationId },
      }),
    });
  }, [client, connectionStatus, fixture, isReservationIdValid, reservationId]);

  return { order, errorMessage, isLoading, isFixture: fixture };
};
