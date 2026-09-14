import { useCallback, useEffect, useRef, useState } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";
import { useStompSubscription } from "@shared/realtime/use-stomp-subscription";

import { PAYMENT_STOMP_DESTINATIONS } from "./payment.constants";
import type { PaymentResultRequest, PaymentResultStatus } from "./payment.types";
import { parsePaymentCommandResponse } from "./payment.utils";

interface UsePaymentResultProps {
  request: PaymentResultRequest | null;
}

export const usePaymentResult = ({ request }: UsePaymentResultProps) => {
  const client = useStompStore((state) => state.client);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getClient = useStompStore((state) => state.getClient);
  const requestIdRef = useRef<string | null>(null);
  const requestKey = request ? JSON.stringify(request) : null;
  const requestRef = useRef<PaymentResultRequest | null>(request);
  const requestKeyRef = useRef<string | null>(requestKey);
  const hasPublishedRequestRef = useRef(false);
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
    if (requestKeyRef.current !== requestKey) {
      requestKeyRef.current = requestKey;
      requestRef.current = request;
      requestIdRef.current = null;
      hasPublishedRequestRef.current = false;
      statusRef.current = "pending";
      setStatus("pending");
      setErrorMessage(null);
    }

    if (!requestRef.current || !client || connectionStatus !== "connected" || !client.connected) {
      return;
    }

    if (statusRef.current !== "pending" || hasPublishedRequestRef.current) {
      return;
    }

    const requestId = requestIdRef.current ?? crypto.randomUUID();
    requestIdRef.current = requestId;
    hasPublishedRequestRef.current = true;
    setStatus("pending");
    setErrorMessage(null);

    client.publish({
      destination: PAYMENT_STOMP_DESTINATIONS.request,
      body: JSON.stringify({ requestId, ...requestRef.current }),
    });
  }, [client, connectionStatus, request, requestKey]);

  return { errorMessage, status };
};
