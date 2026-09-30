import { OAUTH_ERROR_CONTENT_MAP, UNKNOWN_OAUTH_ERROR_CONTENT } from "@pages/login/model/oauth-error.constants";
import { getOAuthErrorContent } from "@pages/login/model/oauth-error.utils";

describe("getOAuthErrorContent", () => {
  it("null을 받으면 UNKNOWN 에러 콘텐츠를 반환한다", () => {
    expect(getOAuthErrorContent(null)).toBe(UNKNOWN_OAUTH_ERROR_CONTENT);
  });

  it("빈 문자열을 받으면 UNKNOWN 에러 콘텐츠를 반환한다", () => {
    expect(getOAuthErrorContent("")).toBe(UNKNOWN_OAUTH_ERROR_CONTENT);
  });

  it("정의되지 않은 에러 코드를 받으면 UNKNOWN 에러 콘텐츠를 반환한다", () => {
    expect(getOAuthErrorContent("SOME_RANDOM_CODE")).toBe(UNKNOWN_OAUTH_ERROR_CONTENT);
  });

  it.each(Object.keys(OAUTH_ERROR_CONTENT_MAP) as (keyof typeof OAUTH_ERROR_CONTENT_MAP)[])(
    "유효한 에러 코드 %s에 해당하는 콘텐츠를 반환한다",
    (code) => {
      expect(getOAuthErrorContent(code)).toBe(OAUTH_ERROR_CONTENT_MAP[code]);
    },
  );
});
