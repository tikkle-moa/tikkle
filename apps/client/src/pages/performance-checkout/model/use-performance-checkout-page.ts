import { useLocation, useParams } from "react-router";

import { useCurrentTime } from "@shared/model/use-current-time";

import { useSessionStore } from "@entities/session";

import { getRemainingSeconds, isPerformanceCheckoutLocationState } from "@features/performance-booking";

import { usePerformanceCheckoutNavigation } from "./use-performance-checkout-navigation";

export const usePerformanceCheckoutPage = () => {
  const { performanceId } = useParams();
  const location = useLocation();
  const now = useCurrentTime();
  const user = useSessionStore((store) => store.user);
  const id = Number(performanceId);
  const state = isPerformanceCheckoutLocationState(location.state, id) ? location.state : null;
  const performance = state?.performance;
  const venue = state?.venue;
  const venueSeats = state?.venueSeats ?? [];
  const selectedSeatIds = state?.review.venueSeatIds ?? [];
  const selectedSeats = venueSeats.filter((seat) => selectedSeatIds.includes(seat.id));
  const remainingSeconds = state ? getRemainingSeconds(state.review.expiresAt, now) : 0;
  const totalAmount = selectedSeats.reduce((total, seat) => total + seat.price, 0);
  const navigation = usePerformanceCheckoutNavigation({ performanceId: id, review: state?.review ?? null });

  return {
    checkoutErrorMessage: navigation.checkoutErrorMessage,
    isStarting: navigation.isStarting,
    isEnding: navigation.isEnding,
    reviewErrorMessage: navigation.reviewErrorMessage,
    isNavigationBlocked: navigation.isNavigationBlocked,
    startCheckout: navigation.startCheckout,
    handleReturnToSeats: navigation.handleReturnToSeats,
    handleLeaveReview: navigation.handleLeaveReview,
    handleStayOnReview: navigation.handleStayOnReview,
    user,
    state,
    performance,
    venue,
    selectedSeatIds,
    selectedSeats,
    remainingSeconds,
    totalAmount,
  };
};
