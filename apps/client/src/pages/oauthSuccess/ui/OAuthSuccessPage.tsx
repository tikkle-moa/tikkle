import { useOAuthSuccess } from "../model/use-oauth-success";

const OAuthSuccessPage = () => {
  useOAuthSuccess();

  return (
    <main className="from-brand-primary/10 to-brand-accent/10 flex min-h-screen items-center justify-center bg-gradient-to-br via-white px-5 py-10">
      <section aria-live="polite" className="border-brand-primary/15 w-full max-w-110 rounded-3xl border bg-white p-8 text-center shadow-xl">
        <img alt="Tikkle" className="mx-auto h-auto w-32" src="/brand/tikkle-logo.svg" />

        <div
          aria-hidden="true"
          className="border-brand-primary/15 border-t-brand-primary mx-auto mt-8 h-12 w-12 animate-spin rounded-full border-4"
        />

        <h1 className="text-brand-ink mt-7 text-2xl font-bold tracking-tight">로그인이 완료됐어요</h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">콘서트 페이지로 이동하고 있어요.</p>
      </section>
    </main>
  );
};

export default OAuthSuccessPage;
