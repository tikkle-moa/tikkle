import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { generatePath, useBlocker, useNavigate } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { clearPerformanceSeatSelectionSession, useCheckoutReview, useStartCheckout } from "@features/performance-booking";
import type { PerformanceCheckoutLocationState } from "@features/performance-booking";

interface UsePerformanceCheckoutNavigationProps {
  performanceId: number;
  review: PerformanceCheckoutLocationState["review"] | null;
}

export const usePerformanceCheckoutNavigation = ({ performanceId, review }: UsePerformanceCheckoutNavigationProps) => {
  const navigate = useNavigate();
  const [isPopNavigation, setIsPopNavigation] = useState(false);
  const allowNextNavigationRef = useRef(false);
  const pendingNavigationRef = useRef<"return_to_seats" | "leave_review" | null>(null);
  const isPopNavigationRef = useRef(false);
  const isPopEndRequestedRef = useRef(false);
  const blocker = useBlocker(({ historyAction }) => {
    const shouldBlock = Boolean(review) && !allowNextNavigationRef.current;
    const isPop = shouldBlock && historyAction === "POP";
    isPopNavigationRef.current = isPop;
    setIsPopNavigation(isPop);
    return shouldBlock;
  });
  const blockerRef = useRef(blocker);
  useLayoutEffect(() => {
    blockerRef.current = blocker;
  }, [blocker]);

  const handleReviewEnd = useCallback(
    (canResumeHold: boolean) => {
      const pendingNavigation = pendingNavigationRef.current;
      pendingNavigationRef.current = null;

      if (!canResumeHold) clearPerformanceSeatSelectionSession(performanceId);

      if (pendingNavigation === "leave_review") {
        isPopNavigationRef.current = false;
        isPopEndRequestedRef.current = false;
        setIsPopNavigation(false);
        blockerRef.current.proceed?.();
        return;
      }

      if (pendingNavigation === "return_to_seats") {
        isPopNavigationRef.current = false;
        isPopEndRequestedRef.current = false;
        setIsPopNavigation(false);
        allowNextNavigationRef.current = true;
        navigate(generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(performanceId) }), { replace: true });
      }
    },
    [navigate, performanceId],
  );

  const {
    errorMessage: reviewErrorMessage,
    isEnding,
    endReview,
  } = useCheckoutReview({
    performanceId,
    sessionId: review?.sessionId,
    onEndSuccess: handleReviewEnd,
  });

  useEffect(() => {
    if (blocker.state !== "blocked" || !isPopNavigationRef.current || isPopEndRequestedRef.current || !review || isEnding) return;

    isPopEndRequestedRef.current = true;
    pendingNavigationRef.current = "leave_review";
    endReview(review.reviewToken, review.groupId);
  }, [blocker.state, endReview, isEnding, review]);

  useEffect(() => {
    if (
      blocker.state !== "blocked" ||
      !isPopNavigationRef.current ||
      pendingNavigationRef.current !== "leave_review" ||
      isEnding ||
      !reviewErrorMessage
    ) {
      return;
    }

    pendingNavigationRef.current = null;
    isPopNavigationRef.current = false;
    isPopEndRequestedRef.current = false;
    setIsPopNavigation(false);
    blockerRef.current.reset?.();
  }, [blocker.state, isEnding, reviewErrorMessage]);

  const handleCheckoutSuccess = useCallback(
    (reservationId: number) => {
      clearPerformanceSeatSelectionSession(performanceId);
      allowNextNavigationRef.current = true;
      navigate(generatePath(ROUTE_PATHS.PAYMENT_CHECKOUT, { reservationId: String(reservationId) }));
    },
    [navigate, performanceId],
  );
  const {
    errorMessage: checkoutErrorMessage,
    isStarting,
    startCheckout,
  } = useStartCheckout({
    performanceId,
    reviewToken: review?.reviewToken ?? "",
    groupId: review?.groupId,
    enabled: Boolean(review),
    onSuccess: handleCheckoutSuccess,
  });

  const handleReturnToSeats = () => {
    if (!review || isEnding) return;
    isPopNavigationRef.current = false;
    isPopEndRequestedRef.current = false;
    setIsPopNavigation(false);
    pendingNavigationRef.current = "return_to_seats";
    endReview(review.reviewToken, review.groupId);
  };

  const handleLeaveReview = () => {
    if (!review || blockerRef.current.state !== "blocked" || isEnding) return;
    pendingNavigationRef.current = "leave_review";
    endReview(review.reviewToken, review.groupId);
  };

  const handleStayOnReview = () => {
    pendingNavigationRef.current = null;
    isPopNavigationRef.current = false;
    isPopEndRequestedRef.current = false;
    setIsPopNavigation(false);
    blockerRef.current.reset?.();
  };

  return {
    checkoutErrorMessage,
    isStarting,
    isEnding,
    reviewErrorMessage,
    isNavigationBlocked: blocker.state === "blocked" && !isPopNavigation,
    startCheckout,
    handleReturnToSeats,
    handleLeaveReview,
    handleStayOnReview,
  };
};
