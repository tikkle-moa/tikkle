import { useBlocker } from "react-router";

import { PAYMENT_NAVIGATION_WARNING_MESSAGE } from "./payment.constants";

interface UsePaymentNavigationGuardProps {
  enabled: boolean;
  allowedPathnames?: readonly string[];
}

export const usePaymentNavigationGuard = ({ enabled, allowedPathnames = [] }: UsePaymentNavigationGuardProps) => {
  const blocker = useBlocker(({ nextLocation }) => enabled && !allowedPathnames.includes(nextLocation.pathname));

  return {
    isBlocked: blocker.state === "blocked",
    message: PAYMENT_NAVIGATION_WARNING_MESSAGE,
    proceed: blocker.proceed ?? (() => undefined),
    reset: blocker.reset ?? (() => undefined),
  };
};
