import { useEffect, useRef, useState } from "react";

import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import { useStompStore } from "@shared/realtime/stomp.store";

import { CHECKOUT_REVIEW_MAX_REQUEST_ATTEMPTS, CHECKOUT_REVIEW_RESPONSE_TIMEOUT_MS } from "./performance-booking.constants";
import { isCheckoutReview } from "./performance-booking.utils";

interface UseCheckoutReviewProps {
  performanceId: number;
  sessionId?: string;
  onBeginSuccess?: (review: BeginCheckoutReviewMessageData) => void;
  onEndSuccess?: (canResumeHold: boolean) => void;
}

interface PendingReviewRequest {
  requestId: string;
  reviewToken: string;
  attempts: number;
}

export const useCheckoutReview = ({ performanceId, sessionId, onBeginSuccess, onEndSuccess }: UseCheckoutReviewProps) => {
  const stompClient = useStompStore((state) => state.stompClient);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const getStompClient = useStompStore((state) => state.getStompClient);
  const beginTokenRef = useRef<string | null>(null);
  const beginRequestRef = useRef<PendingReviewRequest | null>(null);
  const endRequestRef = useRef<PendingReviewRequest | null>(null);
  const beginTimeoutRef = useRef<number | null>(null);
  const endTimeoutRef = useRef<number | null>(null);
  const [isBeginning, setIsBeginning] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (beginTimeoutRef.current !== null) window.clearTimeout(beginTimeoutRef.current);
      if (endTimeoutRef.current !== null) window.clearTimeout(endTimeoutRef.current);
      beginRequestRef.current = null;
      endRequestRef.current = null;
    },
    [],
  );

  useEffect(() => {
    getStompClient();
  }, [getStompClient]);

  useEffect(() => {
    if (performanceId <= 0 || !stompClient || connectionStatus !== "connected") return;

    const beginSubscription = stompClient.subscribe({
      path: "/reservation/begin-checkout-review",
      callback: (message) => {
        const request = beginRequestRef.current;
        if (!request || message.requestId !== request.requestId) return;

        if (beginTimeoutRef.current !== null) window.clearTimeout(beginTimeoutRef.current);
        beginTimeoutRef.current = null;
        beginRequestRef.current = null;
        setIsBeginning(false);

        if (
          !message.success ||
          !isCheckoutReview(message.data) ||
          message.data.reviewToken !== request.reviewToken ||
          message.data.performanceId !== performanceId
        ) {
          setErrorMessage("예매 정보 확인을 시작하지 못했습니다. 다시 시도해 주세요.");
          return;
        }

        onBeginSuccess?.(message.data);
      },
      errorCallback: (message) => {
        if (message.requestId !== beginRequestRef.current?.requestId) return;

        if (beginTimeoutRef.current !== null) window.clearTimeout(beginTimeoutRef.current);
        beginTimeoutRef.current = null;
        beginRequestRef.current = null;
        setIsBeginning(false);
        setErrorMessage(message.error.message);
      },
    });

    const endSubscription = stompClient.subscribe({
      path: "/reservation/end-checkout-review",
      callback: (message) => {
        if (message.requestId !== endRequestRef.current?.requestId) return;

        if (endTimeoutRef.current !== null) window.clearTimeout(endTimeoutRef.current);
        endTimeoutRef.current = null;
        endRequestRef.current = null;
        setIsEnding(false);

        if (!message.success || message.data?.performanceId !== performanceId) {
          setErrorMessage("좌석 선택으로 돌아가지 못했습니다. 다시 시도해 주세요.");
          return;
        }

        onEndSuccess?.(message.data.canResumeHold);
      },
      errorCallback: (message) => {
        if (message.requestId !== endRequestRef.current?.requestId) return;

        if (endTimeoutRef.current !== null) window.clearTimeout(endTimeoutRef.current);
        endTimeoutRef.current = null;
        endRequestRef.current = null;
        setIsEnding(false);
        setErrorMessage(message.error.message);
      },
    });

    return () => {
      beginSubscription.unsubscribe();
      endSubscription.unsubscribe();
    };
  }, [connectionStatus, onBeginSuccess, onEndSuccess, performanceId, stompClient]);

  const beginReview = () => {
    if (beginRequestRef.current || endRequestRef.current) return;
    if (!stompClient || connectionStatus !== "connected") {
      setErrorMessage("서버 연결 후 다시 시도해 주세요.");
      return;
    }

    const reviewToken = beginTokenRef.current ?? crypto.randomUUID();
    beginTokenRef.current = reviewToken;
    const request = { requestId: crypto.randomUUID(), reviewToken, attempts: 1 };
    beginRequestRef.current = request;
    setIsBeginning(true);
    setErrorMessage(null);

    const waitForResponse = () => {
      beginTimeoutRef.current = window.setTimeout(() => {
        if (beginRequestRef.current !== request) return;

        const { stompClient: activeClient, connectionStatus: activeStatus } = useStompStore.getState();
        if (request.attempts < CHECKOUT_REVIEW_MAX_REQUEST_ATTEMPTS && activeClient && activeStatus === "connected") {
          request.attempts += 1;
          waitForResponse();
          activeClient.publish({
            path: "/reservation/begin-checkout-review",
            command: { requestId: request.requestId, data: { performanceId, reviewToken, sessionId } },
          });
          return;
        }

        beginRequestRef.current = null;
        beginTimeoutRef.current = null;
        setIsBeginning(false);
        setErrorMessage("예매 정보 확인 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
      }, CHECKOUT_REVIEW_RESPONSE_TIMEOUT_MS);
    };

    waitForResponse();
    stompClient.publish({
      path: "/reservation/begin-checkout-review",
      command: { requestId: request.requestId, data: { performanceId, reviewToken, sessionId } },
    });
  };

  const endReview = (reviewToken: string, groupId?: string) => {
    if (beginRequestRef.current || endRequestRef.current) return;
    if (!stompClient || connectionStatus !== "connected") {
      setErrorMessage("서버 연결 후 다시 시도해 주세요.");
      return;
    }

    const request = { requestId: crypto.randomUUID(), reviewToken, attempts: 1 };
    endRequestRef.current = request;
    setIsEnding(true);
    setErrorMessage(null);

    const waitForResponse = () => {
      endTimeoutRef.current = window.setTimeout(() => {
        if (endRequestRef.current !== request) return;

        const { stompClient: activeClient, connectionStatus: activeStatus } = useStompStore.getState();
        if (request.attempts < CHECKOUT_REVIEW_MAX_REQUEST_ATTEMPTS && activeClient && activeStatus === "connected") {
          request.attempts += 1;
          waitForResponse();
          activeClient.publish({
            path: "/reservation/end-checkout-review",
            command: { requestId: request.requestId, data: { performanceId, reviewToken, groupId } },
          });
          return;
        }

        endRequestRef.current = null;
        endTimeoutRef.current = null;
        setIsEnding(false);
        setErrorMessage("좌석 선택 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
      }, CHECKOUT_REVIEW_RESPONSE_TIMEOUT_MS);
    };

    waitForResponse();
    stompClient.publish({
      path: "/reservation/end-checkout-review",
      command: { requestId: request.requestId, data: { performanceId, reviewToken, groupId } },
    });
  };

  return { isBeginning, isEnding, errorMessage, beginReview, endReview };
};
