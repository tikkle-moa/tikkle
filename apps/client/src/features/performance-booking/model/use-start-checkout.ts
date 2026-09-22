import { useEffect, useRef, useState } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";

import { isStartCheckoutData } from "./performance-booking.utils";

interface UseStartCheckoutProps {
  performanceId: number;
  reviewToken: string;
  onSuccess: (reservationId: number) => void;
  enabled?: boolean;
}

const RESPONSE_TIMEOUT_MS = 8_000;
const MAX_REQUEST_ATTEMPTS = 2;

export const useStartCheckout = ({ performanceId, reviewToken, onSuccess, enabled = true }: UseStartCheckoutProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getStompClient = useStompStore((state) => state.getStompClient);
  const requestIdRef = useRef<string | null>(null);
  const requestTimeoutRef = useRef<number | null>(null);
  const requestAttemptsRef = useRef(0);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (requestTimeoutRef.current !== null) window.clearTimeout(requestTimeoutRef.current);
      requestIdRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;

    getStompClient();
  }, [enabled, getStompClient]);

  useEffect(() => {
    if (!enabled || performanceId <= 0 || !stompClient || connectionStatus !== "connected") return;

    const subscription = stompClient.subscribe({
      path: "/reservation/start-checkout",
      callback: (message) => {
        if (message.requestId !== requestIdRef.current) return;

        if (requestTimeoutRef.current !== null) window.clearTimeout(requestTimeoutRef.current);
        requestIdRef.current = null;
        setIsStarting(false);
        if (!message.success || !isStartCheckoutData(message.data)) {
          setErrorMessage("결제 준비를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        onSuccess(message.data.reservationId);
      },
      errorCallback: (message) => {
        if (message.requestId !== requestIdRef.current) return;

        if (requestTimeoutRef.current !== null) window.clearTimeout(requestTimeoutRef.current);
        requestIdRef.current = null;
        setIsStarting(false);
        setErrorMessage(message.error.message);
      },
    });

    return () => subscription.unsubscribe();
  }, [connectionStatus, enabled, onSuccess, performanceId, stompClient]);

  const startCheckout = () => {
    if (!enabled) return;

    if (requestIdRef.current || !stompClient || connectionStatus !== "connected") {
      if (!requestIdRef.current) setErrorMessage("서버 연결 후 다시 시도해 주세요.");
      return;
    }

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    requestAttemptsRef.current = 1;
    setIsStarting(true);
    setErrorMessage(null);

    const waitForResponse = () => {
      requestTimeoutRef.current = window.setTimeout(() => {
        if (requestIdRef.current !== requestId) return;

        const { stompClient: activeClient, connectionStatus: activeStatus } = useStompStore.getState();
        if (requestAttemptsRef.current < MAX_REQUEST_ATTEMPTS && activeClient && activeStatus === "connected") {
          requestAttemptsRef.current += 1;
          waitForResponse();
          activeClient.publish({
            path: "/reservation/start-checkout",
            command: { requestId, data: { performanceId, reviewToken } },
          });
          return;
        }

        requestIdRef.current = null;
        requestTimeoutRef.current = null;
        setIsStarting(false);
        setErrorMessage("결제 준비 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
      }, RESPONSE_TIMEOUT_MS);
    };

    waitForResponse();
    stompClient.publish({
      path: "/reservation/start-checkout",
      command: { requestId, data: { performanceId, reviewToken } },
    });
  };

  return { errorMessage, isStarting, startCheckout };
};
