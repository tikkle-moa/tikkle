import { useLocation } from "react-router";

import { HEADER_HIDDEN_PATHS } from "@shared/config/router.config";

export const useHeaderVisibility = () => {
  const { pathname } = useLocation();

  return {
    isHeaderHidden: HEADER_HIDDEN_PATHS.includes(pathname as (typeof HEADER_HIDDEN_PATHS)[number]),
  };
};
