import type { OAuthProvider, OAuthProviderConfig } from "../../../features/auth/model/oauth.types";
import githubLogo from "../../../shared/assets/oauth/github.svg";
import googleLogo from "../../../shared/assets/oauth/google.svg";
import kakaoLogo from "../../../shared/assets/oauth/kakao-symbol.png";
import naverLogo from "../../../shared/assets/oauth/naver.svg";

export const OAUTH_PROVIDER_MAP: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    label: "Google로 계속하기",
    iconSrc: googleLogo,
    className: "border-slate-200 bg-white text-slate-800",
  },
  kakao: {
    label: "카카오로 계속하기",
    iconSrc: kakaoLogo,
    className: "border-[#F2D100] bg-[#FEE500] text-[#191600]",
  },
  naver: {
    label: "네이버로 계속하기",
    iconSrc: naverLogo,
    className: "border-[#03C75A] bg-[#03C75A] text-white",
  },
  github: {
    label: "GitHub로 계속하기",
    iconSrc: githubLogo,
    className: "border-slate-800 bg-slate-900 text-white",
    iconClassName: "brightness-0 invert",
  },
};
