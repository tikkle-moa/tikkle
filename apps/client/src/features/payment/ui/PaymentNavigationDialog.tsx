import { type SyntheticEvent, useEffect, useRef } from "react";

import { CircleAlert } from "lucide-react";

interface PaymentNavigationDialogProps {
  message: string;
  onProceed: () => void;
  onStay: () => void;
}

const PaymentNavigationDialog = ({ message, onProceed, onStay }: PaymentNavigationDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onStay();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="payment-navigation-title"
      className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
      onCancel={handleCancel}
    >
      <section className="p-7 sm:p-9">
        <div aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <CircleAlert className="size-6" />
        </div>
        <h2 id="payment-navigation-title" className="mt-5 text-center text-xl font-bold text-slate-950">
          결제 준비를 중단할까요?
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-pretty break-keep text-slate-500">{message}</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            onClick={onStay}
          >
            결제 계속하기
          </button>
          <button
            type="button"
            className="bg-brand-primary focus-visible:outline-brand-primary rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={onProceed}
          >
            이전 화면으로 이동
          </button>
        </div>
      </section>
    </dialog>
  );
};

export default PaymentNavigationDialog;
