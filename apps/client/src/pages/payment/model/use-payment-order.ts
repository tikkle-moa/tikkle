import { useEffect, useRef, useState } from "react";

import type { PaymentOrderMessageData } from "@tikkle/api-types";

import { useStompStore } from "@shared/realtime/stomp.store";

import type { PaymentOrderState } from "@features/payment";

interface UsePaymentOrderProps {
  reservationId: number;
  initialOrder?: PaymentOrderMessageData;
}

export const usePaymentOrder = ({ reservationId, initialOrder }: UsePaymentOrderProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getStompClient = useStompStore((state) => state.getStompClient);
  const requestIdRef = useRef<string | null>(null);
  const queryKey = `${reservationId}:${initialOrder?.orderId ?? "server"}`;
  const [paymentState, setPaymentState] = useState<PaymentOrderState>(() => ({
    key: queryKey,
    order: initialOrder ?? null,
    errorMessage: null,
    isLoading: initialOrder === undefined,
  }));
  const isReservationIdValid = Number.isInteger(reservationId) && reservationId > 0;

  const visibleState = paymentState.key === queryKey ? paymentState : { key: queryKey, order: null, errorMessage: null, isLoading: true };
  const order = initialOrder ?? visibleState.order;
  const errorMessage = !isReservationIdValid ? "올바르지 않은 결제 주문입니다." : visibleState.errorMessage;
  const isLoading = !isReservationIdValid || initialOrder !== undefined ? false : visibleState.isLoading;

  useEffect(() => {
    if (initialOrder !== undefined) return;
    getStompClient();
  }, [getStompClient, initialOrder]);

  useEffect(() => {
    requestIdRef.current = null;

    if (!isReservationIdValid || initialOrder !== undefined || !stompClient || connectionStatus !== "connected") return;

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;

    const subscription = stompClient.subscribe({
      path: "/reservation/get-payment-order",
      callback: (message) => {
        if (message.requestId !== requestIdRef.current) return;

        setPaymentState({
          key: queryKey,
          order: message.data,
          errorMessage: null,
          isLoading: false,
        });
      },
      errorCallback: (message) => {
        if (message.requestId !== requestIdRef.current) return;

        setPaymentState({
          key: queryKey,
          order: null,
          errorMessage: message.error?.message ?? "결제 주문서를 불러오지 못했습니다.",
          isLoading: false,
        });
      },
    });

    stompClient.publish({
      path: "/reservation/get-payment-order",
      command: {
        requestId,
        data: { reservationId },
      },
    });

    return () => subscription.unsubscribe();
  }, [connectionStatus, initialOrder, isReservationIdValid, queryKey, reservationId, stompClient]);

  return { order, errorMessage, isLoading };
};
