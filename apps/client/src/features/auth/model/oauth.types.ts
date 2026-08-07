import type { operations } from "@tikkle/api-types";

export type OAuthProvider = operations["getAuthorizationUrl"]["parameters"]["path"]["oauth_provider"];

export interface OAuthProviderConfig {
  label: string;
  iconSrc: string;
  className: string;
  iconClassName?: string;
}
