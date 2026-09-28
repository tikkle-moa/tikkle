import { type SyntheticEvent, useEffect, useRef } from "react";

import { CircleAlert } from "lucide-react";

interface PerformanceCheckoutNavigationDialogProps {
  errorMessage: string | null;
  isEnding: boolean;
  onProceed: () => void;
  onStay: () => void;
}

const PerformanceCheckoutNavigationDialog = ({ errorMessage, isEnding, onProceed, onStay }: PerformanceCheckoutNavigationDialogProps) => {
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
      aria-labelledby="performance-checkout-navigation-title"
      className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
      onCancel={handleCancel}
    >
      <section className="p-7 sm:p-9">
        <div aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <CircleAlert className="size-6" />
        </div>
        <h2 id="performance-checkout-navigation-title" className="mt-5 text-center text-xl font-bold text-slate-950">
          예매 정보 확인을 종료할까요?
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-pretty break-keep text-slate-500">
          나가면 예매 정보 확인 잠금이 해제됩니다. 좌석 점유는 만료 시간까지 유지되며, 남은 시간은 계속 줄어듭니다.
        </p>
        {errorMessage && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            disabled={isEnding}
            onClick={onStay}
          >
            계속 확인하기
          </button>
          <button
            type="button"
            className="bg-brand-primary focus-visible:outline-brand-primary rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70"
            disabled={isEnding}
            onClick={onProceed}
          >
            {isEnding ? "좌석 상태 확인 중..." : "나가기"}
          </button>
        </div>
      </section>
    </dialog>
  );
};

export default PerformanceCheckoutNavigationDialog;
