import { useSearchParams } from "react-router";

import { getOAuthErrorGuide } from "./oauth-error.constants";

import type { OAuthProvider } from "../../../features/auth";
import { ROUTE_PATHS } from "../../../shared/config/router.config";

export const useLogin = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const errorCode = searchParams.get("error_code");
  const errorGuide = getOAuthErrorGuide(errorCode);

  const handleLogin = (provider: OAuthProvider) => {
    const params = new URLSearchParams({
      redirect_uri: ROUTE_PATHS.CONCERTS,
      mode: "login",
    });

    window.location.assign(`/api/auth/oauth/${provider}?${params.toString()}`);
  };

  const handleCloseError = () => {
    const nextSearchParams = new URLSearchParams(searchParams);

    nextSearchParams.delete("error_code");

    setSearchParams(nextSearchParams, { replace: true });
  };

  return {
    errorGuide,
    hasOAuthError: errorCode !== null,
    handleCloseError,
    handleLogin,
  };
};
