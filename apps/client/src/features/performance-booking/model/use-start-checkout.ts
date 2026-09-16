import { useCallback, useEffect, useRef, useState } from "react";

import { useStompStore } from "@shared/realtime/stomp.store";
import { useStompSubscription } from "@shared/realtime/use-stomp-subscription";

import { PERFORMANCE_BOOKING_DESTINATIONS } from "./performance-booking.constants";
import { isStartCheckoutData, parseBookingMessage } from "./performance-booking.utils";

interface UseStartCheckoutProps {
  performanceId: number;
  onSuccess: (reservationId: number) => void;
}

export const useStartCheckout = ({ performanceId, onSuccess }: UseStartCheckoutProps) => {
  const client = useStompStore((state) => state.client);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getClient = useStompStore((state) => state.getClient);
  const requestIdRef = useRef<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getClient();
  }, [getClient]);

  const handleMessage = useCallback(
    (message: { body: string }) => {
      const response = parseBookingMessage(message.body);
      if (!response || response.requestId !== requestIdRef.current) return;

      setIsStarting(false);
      const checkoutData = "data" in response ? response.data : null;
      if (!response.success || !isStartCheckoutData(checkoutData)) {
        setErrorMessage("error" in response ? response.error.message : "결제 준비를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      onSuccess(checkoutData.reservationId);
    },
    [onSuccess],
  );

  useStompSubscription({
    destination: PERFORMANCE_BOOKING_DESTINATIONS.checkoutResponse,
    enabled: performanceId > 0,
    onMessage: handleMessage,
  });

  const startCheckout = () => {
    if (isStarting || !client || connectionStatus !== "connected" || !client.connected) {
      if (!isStarting) setErrorMessage("서버 연결 후 다시 시도해 주세요.");
      return;
    }

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    setIsStarting(true);
    setErrorMessage(null);
    client.publish({
      destination: PERFORMANCE_BOOKING_DESTINATIONS.checkoutRequest,
      body: JSON.stringify({ requestId, data: { performanceId } }),
    });
  };

  return { errorMessage, isStarting, startCheckout };
};
