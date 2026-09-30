import type { components } from "@tikkle/api-types";

export type OAuthErrorCode = components["schemas"]["OAuthErrorCode"];

export interface OAuthErrorContent {
  title: string;
  description: string;
  actionLabel: string;
}
