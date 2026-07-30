export type OAuthErrorCode =
  | "OAUTH_ACCESS_DENIED"
  | "OAUTH_STATE_MISSING"
  | "OAUTH_STATE_MISMATCH"
  | "OAUTH_STATE_EXPIRED"
  | "OAUTH_CODE_EXCHANGE_FAILED"
  | "OAUTH_PROFILE_FETCH_FAILED"
  | "OAUTH_ACCOUNT_CONFLICT";

export interface OAuthErrorContent {
  title: string;
  description: string;
  actionLabel: string;
}
