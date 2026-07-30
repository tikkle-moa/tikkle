import type { OAuthErrorContent } from "../model/oauth-error.types";
import { useOAuthErrorModal } from "../model/use-oauth-error-modal";

interface OAuthErrorModalProps {
  content: OAuthErrorContent;
  onClose: () => void;
}

export const OAuthErrorModal = ({ content, onClose }: OAuthErrorModalProps) => {
  const { dialogRef, handleCancel } = useOAuthErrorModal(onClose);

  return (
    <dialog
      aria-labelledby="oauth-error-title"
      className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
      onCancel={handleCancel}
      ref={dialogRef}
    >
      <section className="p-7 text-center sm:p-9">
        <div aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
          !
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-950" id="oauth-error-title">
          {content.title}
        </h2>

        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-pretty break-keep text-slate-500">{content.description}</p>

        <button
          autoFocus
          className="from-brand-primary to-brand-accent focus-visible:outline-brand-primary mt-7 w-full rounded-xl bg-linear-to-r px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={onClose}
          type="button"
        >
          {content.actionLabel}
        </button>
      </section>
    </dialog>
  );
};
