import { usePrompt } from "react-router";

import { PAYMENT_NAVIGATION_WARNING_MESSAGE } from "./payment.constants";

interface UsePaymentNavigationGuardProps {
  enabled: boolean;
  allowedPathnames?: readonly string[];
}

export const usePaymentNavigationGuard = ({ enabled, allowedPathnames = [] }: UsePaymentNavigationGuardProps) => {
  usePrompt({
    message: PAYMENT_NAVIGATION_WARNING_MESSAGE,
    when: ({ nextLocation }) => enabled && !allowedPathnames.includes(nextLocation.pathname),
  });
};
