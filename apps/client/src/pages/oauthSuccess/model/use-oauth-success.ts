import { useEffect } from "react";
import { useNavigate } from "react-router";

import { ROUTE_PATHS } from "../../../shared/config/router.config";

const SUCCESS_REDIRECT_DELAY_MS = 1200;

export const useOAuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      navigate(ROUTE_PATHS.CONCERTS, { replace: true });
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [navigate]);
};
