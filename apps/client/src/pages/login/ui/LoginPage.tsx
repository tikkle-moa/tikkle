import { OAuthButton, type OAuthProvider } from "../../../features/auth";
import { ROUTE_PATHS } from "../../../shared/config/router.config";
import { OAUTH_PROVIDER_MAP } from "../model/login.constants";

const LoginPage = () => {
  const handleLogin = (provider: OAuthProvider) => {
    const params = new URLSearchParams({
      redirect_uri: ROUTE_PATHS.CONCERTS,
      mode: "login",
    });

    window.location.assign(`/api/auth/oauth/${provider}?${params.toString()}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-110 rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)] sm:p-10">
        <div className="mb-10">
          <p className="mb-5 text-xl font-black tracking-tight text-slate-950">TIKKLE</p>
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
  );
};

export default LoginPage;
