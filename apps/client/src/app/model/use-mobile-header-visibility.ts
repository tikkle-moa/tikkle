import { useLocation } from "react-router";

import { MOBILE_HEADER_HIDDEN_PATHS } from "@shared/config/router.config";

export const useMobileHeaderVisibility = () => {
  const { pathname } = useLocation();

  return {
    isMobileHeaderHidden: MOBILE_HEADER_HIDDEN_PATHS.includes(pathname as (typeof MOBILE_HEADER_HIDDEN_PATHS)[number]),
  };
};
