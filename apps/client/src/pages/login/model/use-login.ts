import { useSearchParams } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { OAuthProvider } from "@features/auth";

import { getOAuthErrorContent } from "./oauth-error.utils";

export const useLogin = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const errorCode = searchParams.get("error_code");
  const errorContent = getOAuthErrorContent(errorCode);

  const handleLogin = (provider: OAuthProvider) => {
    const params = new URLSearchParams({
      redirect_uri: ROUTE_PATHS.CONCERT_LIST,
    });

    window.location.assign(`/api/auth/oauth/${provider}?${params.toString()}`);
  };

  const handleCloseError = () => {
    const nextSearchParams = new URLSearchParams(searchParams);

    nextSearchParams.delete("error_code");

    setSearchParams(nextSearchParams, { replace: true });
  };

  return {
    errorContent,
    hasOAuthError: errorCode !== null,
    handleCloseError,
    handleLogin,
  };
};
