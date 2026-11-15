import { MemoryRouter } from "react-router";

import { act, renderHook } from "@testing-library/react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { OAUTH_ERROR_CONTENT_MAP, UNKNOWN_OAUTH_ERROR_CONTENT } from "@pages/login/model/oauth-error.constants";
import type { OAuthErrorCode } from "@pages/login/model/oauth-error.types";
import { useLogin } from "@pages/login/model/use-login";

const renderUseLogin = (oauthErrorCode?: OAuthErrorCode | "UNKNOWN_CODE", redirectUri?: string) => {
  const searchParams = new URLSearchParams();
  if (oauthErrorCode) searchParams.set("error_code", oauthErrorCode);
  if (redirectUri) searchParams.set("redirect_uri", redirectUri);
  const search = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  return renderHook(() => useLogin(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[`/login${search}`]}>{children}</MemoryRouter>,
  });
};

describe("useLogin", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { assign: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("에러 상태", () => {
    it("error_code 쿼리가 없으면 hasOAuthError가 false다", () => {
      const { result } = renderUseLogin();
      expect(result.current.hasOAuthError).toBe(false);
    });

    it("error_code 쿼리가 있으면 hasOAuthError가 true다", () => {
      const { result } = renderUseLogin("OAUTH_ACCESS_DENIED");
      expect(result.current.hasOAuthError).toBe(true);
    });

    it("알 수 없는 error_code이면 UNKNOWN 에러 콘텐츠를 반환한다", () => {
      const { result } = renderUseLogin("UNKNOWN_CODE");
      expect(result.current.errorContent).toBe(UNKNOWN_OAUTH_ERROR_CONTENT);
    });

    it.each(Object.keys(OAUTH_ERROR_CONTENT_MAP) as OAuthErrorCode[])("유효한 error_code %s에 대응하는 errorContent를 반환한다", (code) => {
      const { result } = renderUseLogin(code);
      expect(result.current.errorContent).toBe(OAUTH_ERROR_CONTENT_MAP[code]);
    });
  });

  describe("handleCloseError", () => {
    it("호출하면 error_code 쿼리가 제거된다", () => {
      const { result } = renderUseLogin("OAUTH_ACCESS_DENIED");
      act(() => result.current.handleCloseError());
      expect(result.current.hasOAuthError).toBe(false);
    });
  });

  describe("handleLogin", () => {
    it("provider와 함께 올바른 OAuth URL로 이동한다", () => {
      const { result } = renderUseLogin();
      act(() => result.current.handleLogin("google"));
      const calledUrl = (window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      const url = new URL(calledUrl, "http://localhost");
      expect(url.pathname).toBe("/api/auth/oauth/google");
      expect(url.searchParams.get("redirect_uri")).toBe(ROUTE_PATHS.CONCERT_LIST);
    });

    it("로그인 후 원래 초대 URL로 돌아가도록 redirect_uri를 전달한다", () => {
      const redirectUri = "/groups/12?inviteCode=abc123";
      const { result } = renderUseLogin(undefined, redirectUri);

      act(() => result.current.handleLogin("google"));

      const calledUrl = (window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(new URL(calledUrl, "http://localhost").searchParams.get("redirect_uri")).toBe(redirectUri);
    });

    it("외부 URL을 redirect_uri로 받으면 기본 경로를 사용한다", () => {
      const { result } = renderUseLogin(undefined, "//example.com/groups/12");

      act(() => result.current.handleLogin("google"));

      const calledUrl = (window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(new URL(calledUrl, "http://localhost").searchParams.get("redirect_uri")).toBe(ROUTE_PATHS.CONCERT_LIST);
    });
  });
});
