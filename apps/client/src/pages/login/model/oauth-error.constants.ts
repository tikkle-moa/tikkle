import type { OAuthErrorCode, OAuthErrorContent } from "./oauth-error.types";

export const OAUTH_ERROR_CONTENT_MAP: Record<OAuthErrorCode, OAuthErrorContent> = {
  OAUTH_ACCESS_DENIED: {
    title: "로그인이 취소됐어요",
    description: "계정 접근에 동의하지 않아 로그인을 완료하지 못했습니다.",
    actionLabel: "다시 로그인하기",
  },
  OAUTH_STATE_MISSING: {
    title: "로그인 정보를 확인할 수 없어요",
    description: "로그인 요청 정보가 누락되었습니다. 처음부터 다시 시도해 주세요.",
    actionLabel: "다시 로그인하기",
  },
  OAUTH_STATE_MISMATCH: {
    title: "유효하지 않은 로그인 요청이에요",
    description: "안전한 로그인을 위해 요청을 중단했습니다. 다시 시도해 주세요.",
    actionLabel: "다시 로그인하기",
  },
  OAUTH_STATE_EXPIRED: {
    title: "로그인 요청이 만료됐어요",
    description: "로그인 시간이 초과되었습니다. 처음부터 다시 시도해 주세요.",
    actionLabel: "다시 로그인하기",
  },
  OAUTH_CODE_EXCHANGE_FAILED: {
    title: "로그인을 완료하지 못했어요",
    description: "인증 처리 중 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    actionLabel: "다시 시도하기",
  },
  OAUTH_PROFILE_FETCH_FAILED: {
    title: "계정 정보를 불러오지 못했어요",
    description: "계정 정보를 확인하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    actionLabel: "다시 시도하기",
  },
  OAUTH_ACCOUNT_CONFLICT: {
    title: "이미 연결된 계정이에요",
    description: "이 소셜 계정은 다른 사용자 계정에 연결되어 있습니다.",
    actionLabel: "다른 방법으로 로그인하기",
  },
};

export const UNKNOWN_OAUTH_ERROR_CONTENT: OAuthErrorContent = {
  title: "로그인을 완료하지 못했어요",
  description: "알 수 없는 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  actionLabel: "다시 로그인하기",
};
