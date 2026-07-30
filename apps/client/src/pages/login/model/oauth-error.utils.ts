import { OAUTH_ERROR_CONTENT_MAP, UNKNOWN_OAUTH_ERROR_CONTENT } from "./oauth-error.constants";
import type { OAuthErrorCode, OAuthErrorContent } from "./oauth-error.types";

const isOAuthErrorCode = (errorCode: string): errorCode is OAuthErrorCode => {
  return Object.prototype.hasOwnProperty.call(OAUTH_ERROR_CONTENT_MAP, errorCode);
};

export const getOAuthErrorContent = (errorCode: string | null): OAuthErrorContent => {
  if (!errorCode || !isOAuthErrorCode(errorCode)) {
    return UNKNOWN_OAUTH_ERROR_CONTENT;
  }

  return OAUTH_ERROR_CONTENT_MAP[errorCode];
};
