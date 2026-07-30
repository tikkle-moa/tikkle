import { OAuthErrorModal } from "./OAuthErrorModal";

import { OAuthButton, type OAuthProvider } from "../../../features/auth";
import { OAUTH_PROVIDER_MAP } from "../model/login.constants";
import { useLogin } from "../model/use-login";

const LoginPage = () => {
  const { errorContent, hasOAuthError, handleCloseError, handleLogin } = useLogin();

  return (
    <>
      <main className="from-brand-primary/10 to-brand-accent/10 flex min-h-screen items-center justify-center bg-linear-to-br via-white px-5 py-10">
        <section className="border-brand-primary/15 w-full max-w-110 rounded-3xl border bg-white p-7 shadow-xl sm:p-10">
          <img alt="Tikkle" className="mb-7 h-auto w-36" src="/brand/tikkle-logo.svg" />
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              함께 고르고,
              <br />
              함께 예매하세요.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              일행과 같은 좌석 화면에서 의견을 나누고
              <br />
              원하는 자리를 함께 선택할 수 있어요.
            </p>
          </div>
          <div className="space-y-3">
            {Object.entries(OAUTH_PROVIDER_MAP).map(([provider, config]) => (
              <OAuthButton key={provider} config={config} onSelect={() => handleLogin(provider as OAuthProvider)} />
            ))}
          </div>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">계속하면 Tikkle의 이용약관 및 개인정보 처리방침에 동의하게 됩니다.</p>
        </section>
      </main>

      {hasOAuthError && <OAuthErrorModal content={errorContent} onClose={handleCloseError} />}
    </>
  );
};

export default LoginPage;
