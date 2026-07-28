export type OAuthProvider = "kakao" | "google" | "naver" | "github";

export interface OAuthProviderConfig {
  label: string;
  iconSrc: string;
  className: string;
  iconClassName?: string;
}
