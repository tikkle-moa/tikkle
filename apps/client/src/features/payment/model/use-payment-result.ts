import { useCallback, useEffect, useRef, useState } from "react";

import type { StompFailureMessage } from "@tikkle/api-types";

import { useStompStore } from "@shared/realtime/stomp.store";

import type { PaymentResultRequest, PaymentResultStatus } from "./payment.types";

interface UsePaymentResultProps {
  request: PaymentResultRequest | null;
}

export const usePaymentResult = ({ request }: UsePaymentResultProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const isConnected = useStompStore((state) => state.connectionStatus === "connected");
  const getStompClient = useStompStore((state) => state.getStompClient);

  const requestKey = request ? JSON.stringify(request) : null;

  const requestIdRef = useRef<string | null>(null);
  const requestRef = useRef(request);
  const requestKeyRef = useRef(requestKey);
  const hasPublishedRequestRef = useRef(false);
  const statusRef = useRef<PaymentResultStatus>("pending");

  const [status, setStatus] = useState<PaymentResultStatus>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getStompClient();
  }, [getStompClient]);

  useEffect(() => {
    if (requestKeyRef.current === requestKey) return;

    requestKeyRef.current = requestKey;
    requestRef.current = request;
    requestIdRef.current = null;
    hasPublishedRequestRef.current = false;
    statusRef.current = "pending";

    setStatus("pending");
    setErrorMessage(null);
  }, [request, requestKey]);

  const handleMessage = useCallback((message: { requestId: string }) => {
    if (message.requestId !== requestIdRef.current) return;

    statusRef.current = "succeeded";
    setStatus("succeeded");
  }, []);

  const handleError = useCallback((message: StompFailureMessage) => {
    if (message.requestId !== requestIdRef.current) return;

    setErrorMessage(message.error.message);
    statusRef.current = "failed";
    setStatus("failed");
  }, []);

  useEffect(() => {
    if (!request || !stompClient || !isConnected) return;

    const subscription =
      request.action === "CONFIRM_PAYMENT"
        ? stompClient.subscribe({
            path: "/reservation/confirm-payment",
            callback: handleMessage,
            errorCallback: handleError,
          })
        : stompClient.subscribe({
            path: "/reservation/cancel-payment",
            callback: handleMessage,
            errorCallback: handleError,
          });

    return () => subscription.unsubscribe();
  }, [handleError, handleMessage, isConnected, request, stompClient]);

  useEffect(() => {
    const currentRequest = requestRef.current;

    if (!currentRequest || !stompClient || !isConnected) return;
    if (statusRef.current !== "pending" || hasPublishedRequestRef.current) return;

    const requestId = requestIdRef.current ?? crypto.randomUUID();

    requestIdRef.current = requestId;
    hasPublishedRequestRef.current = true;

    setStatus("pending");
    setErrorMessage(null);

    if (currentRequest.action === "CONFIRM_PAYMENT") {
      stompClient.publish({
        path: "/reservation/confirm-payment",
        command: { requestId, data: currentRequest.data },
      });
    } else {
      stompClient.publish({
        path: "/reservation/cancel-payment",
        command: { requestId, data: currentRequest.data },
      });
    }
  }, [isConnected, request, requestKey, stompClient]);

  return { status, errorMessage };
};
