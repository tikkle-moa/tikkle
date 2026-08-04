import { MemoryRouter } from "react-router";

import type { OAuthProvider } from "@/features/auth";
import { LoginPage } from "@/pages/login";
import { OAUTH_PROVIDER_MAP } from "@/pages/login/model/login.constants";
import type { OAuthErrorCode } from "@/pages/login/model/oauth-error.types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const renderLoginPage = (oauthErrorCode?: OAuthErrorCode) => {
  const search = oauthErrorCode ? `?error_code=${oauthErrorCode}` : "";
  render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <LoginPage />
    </MemoryRouter>,
  );
};

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { assign: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("로고와 제목을 렌더링한다", () => {
    renderLoginPage();
    expect(screen.getByRole("img", { name: "Tikkle" })).toBeInTheDocument();
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("가능한 소셜 로그인 버튼들을 렌더링한다", () => {
    renderLoginPage();
    for (const oauthProvider of Object.keys(OAUTH_PROVIDER_MAP) as OAuthProvider[]) {
      expect(screen.getByRole("button", { name: new RegExp(OAUTH_PROVIDER_MAP[oauthProvider].label) })).toBeInTheDocument();
    }
  });

  it("error_code 쿼리가 없으면 에러 모달을 표시하지 않는다", () => {
    renderLoginPage();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("error_code 쿼리가 있으면 에러 모달을 표시한다", () => {
    renderLoginPage("OAUTH_ACCESS_DENIED");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("소셜 버튼 클릭 시 OAuth URL로 이동한다", async () => {
    renderLoginPage();
    await userEvent.click(screen.getByRole("button", { name: /Google로 계속하기/ }));
    expect(window.location.assign).toHaveBeenCalledWith(expect.stringContaining("/api/auth/oauth/google"));
  });
});
