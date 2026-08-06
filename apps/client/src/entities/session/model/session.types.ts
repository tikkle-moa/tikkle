export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type OAuthProvider = "kakao" | "google" | "naver" | "github";

export type UserRole = "USER" | "ADMIN";

export interface User {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  role: UserRole;
  oauthAccounts: OAuthProvider[];
}
