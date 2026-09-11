import { useCallback, useEffect, useRef, useState } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";
import { useStompSubscription } from "@shared/realtime/use-stomp-subscription";

import { PAYMENT_STOMP_DESTINATIONS } from "./payment.constants";
import { parsePaymentCommandResponse } from "./payment.utils";

export type PaymentResultRequest =
  | {
      action: "CONFIRM_PAYMENT";
      data: { paymentKey: string; orderId: string; amount: number };
    }
  | {
      action: "CANCEL_PAYMENT";
      data: { reservationId: number };
    };

export type PaymentResultStatus = "pending" | "succeeded" | "failed";

interface UsePaymentResultReturn {
  errorMessage: string | null;
  status: PaymentResultStatus;
}

export const usePaymentResult = (request: PaymentResultRequest | null): UsePaymentResultReturn => {
  const client = useStompStore((state) => state.client);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getClient = useStompStore((state) => state.getClient);
  const requestIdRef = useRef<string | null>(null);
  const requestRef = useRef<PaymentResultRequest | null>(request);
  const statusRef = useRef<PaymentResultStatus>("pending");
  const [status, setStatus] = useState<PaymentResultStatus>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getClient();
  }, [getClient]);

  const handleMessage = useCallback((message: { body: string }) => {
    const response = parsePaymentCommandResponse(message.body);

    if (!response || response.requestId !== requestIdRef.current) {
      return;
    }

    if (!response.success) {
      setErrorMessage(response.error?.message ?? "결제 처리 결과를 확인하지 못했습니다.");
      statusRef.current = "failed";
      setStatus("failed");
      return;
    }

    statusRef.current = "succeeded";
    setStatus("succeeded");
  }, []);

  useStompSubscription({
    destination: PAYMENT_STOMP_DESTINATIONS.response,
    onMessage: handleMessage,
    enabled: request !== null,
  });

  useEffect(() => {
    if (requestRef.current !== request) {
      requestRef.current = request;
      requestIdRef.current = null;
      statusRef.current = "pending";
      setStatus("pending");
      setErrorMessage(null);
    }

    if (!request || !client || connectionStatus !== "connected" || !client.connected) {
      return;
    }

    if (statusRef.current !== "pending") {
      return;
    }

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    setStatus("pending");
    setErrorMessage(null);

    client.publish({
      destination: PAYMENT_STOMP_DESTINATIONS.request,
      body: JSON.stringify({ requestId, ...request }),
    });
  }, [client, connectionStatus, request]);

  return { errorMessage, status };
};
