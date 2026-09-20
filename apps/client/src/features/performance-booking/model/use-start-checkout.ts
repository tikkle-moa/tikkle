import { useEffect, useRef, useState } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";

import { isStartCheckoutData } from "./performance-booking.utils";

interface UseStartCheckoutProps {
  performanceId: number;
  onSuccess: (reservationId: number) => void;
  enabled?: boolean;
}

export const useStartCheckout = ({ performanceId, onSuccess, enabled = true }: UseStartCheckoutProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getStompClient = useStompStore((state) => state.getStompClient);
  const requestIdRef = useRef<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        setIsStarting(false);
        if (!message.success || !isStartCheckoutData(message.data)) {
          setErrorMessage("결제 준비를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        onSuccess(message.data.reservationId);
      },
      errorCallback: (message) => {
        if (message.requestId !== requestIdRef.current) return;

        setIsStarting(false);
        setErrorMessage(message.error.message);
      },
    });

    return () => subscription.unsubscribe();
  }, [connectionStatus, enabled, onSuccess, performanceId, stompClient]);

  const startCheckout = () => {
    if (!enabled) return;

    if (isStarting || !stompClient || connectionStatus !== "connected") {
      if (!isStarting) setErrorMessage("서버 연결 후 다시 시도해 주세요.");
      return;
    }

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    setIsStarting(true);
    setErrorMessage(null);
    stompClient.publish({
      path: "/reservation/start-checkout",
      command: { requestId, data: { performanceId } },
    });
  };

  return { errorMessage, isStarting, startCheckout };
};
