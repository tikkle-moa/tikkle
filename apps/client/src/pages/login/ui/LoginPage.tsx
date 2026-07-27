import githubLogo from "../../../shared/assets/oauth/github.svg";
import googleLogo from "../../../shared/assets/oauth/google.svg";
import kakaoLogo from "../../../shared/assets/oauth/kakao-symbol.png";
import naverLogo from "../../../shared/assets/oauth/naver.svg";
import { ROUTE_PATHS } from "../../../shared/config/router.config";

const OAUTH_PROVIDERS = [
  {
    id: "google",
    label: "Google로 계속하기",
    iconSrc: googleLogo,
    className: "border-slate-200 bg-white text-slate-800",
  },
  {
    id: "kakao",
    label: "카카오로 계속하기",
    iconSrc: kakaoLogo,
    className: "border-[#F2D100] bg-[#FEE500] text-[#191600]",
  },
  {
    id: "naver",
    label: "네이버로 계속하기",
    iconSrc: naverLogo,
    className: "border-[#03C75A] bg-[#03C75A] text-white",
  },
  {
    id: "github",
    label: "GitHub로 계속하기",
    iconSrc: githubLogo,
    className: "border-slate-800 bg-slate-900 text-white",
  },
] as const;

const LoginPage = () => {
  const handleLogin = (provider: (typeof OAUTH_PROVIDERS)[number]["id"]) => {
    const params = new URLSearchParams({
      redirect_uri: ROUTE_PATHS.CONCERTS,
      mode: "login",
    });

    window.location.assign(`/api/auth/oauth/${provider}?${params.toString()}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-[440px] rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)] sm:p-10">
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
          {OAUTH_PROVIDERS.map((provider) => (
            <button
              className={`grid h-14 w-full grid-cols-[1.5rem_1fr_1.5rem] items-center gap-3 rounded-xl border px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${provider.className}`}
              key={provider.id}
              onClick={() => handleLogin(provider.id)}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                className={`h-6 w-6 justify-self-center object-contain ${provider.id === "github" ? "brightness-0 invert" : ""}`}
                src={provider.iconSrc}
              />

              <span className="text-center">{provider.label}</span>

              <span aria-hidden="true" />
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">계속하면 Tikkle의 이용약관 및 개인정보 처리방침에 동의하게 됩니다.</p>
      </section>
    </main>
  );
};

export default LoginPage;
