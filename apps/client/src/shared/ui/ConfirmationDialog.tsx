import { useId } from "react";

import { CircleAlert } from "lucide-react";

import { useNativeDialog } from "@shared/model/use-native-dialog";

interface ConfirmationDialogProps {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  errorMessage?: string | null;
  isProcessing?: boolean;
  processingLabel?: string;
}

const ConfirmationDialog = ({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onCancel,
  errorMessage = null,
  isProcessing = false,
  processingLabel,
}: ConfirmationDialogProps) => {
  const titleId = useId();
  const { dialogRef, handleCancel } = useNativeDialog({ onCancel });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
      onCancel={handleCancel}
    >
      <section className="p-7 sm:p-9">
        <div aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <CircleAlert className="size-6" />
        </div>
        <h2 id={titleId} className="mt-5 text-center text-xl font-bold text-slate-950">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-pretty break-keep text-slate-500">{message}</p>
        {errorMessage && (
          <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-wait disabled:opacity-70"
            disabled={isProcessing}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="bg-brand-primary focus-visible:outline-brand-primary rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70"
            disabled={isProcessing}
            onClick={onConfirm}
          >
            {isProcessing ? (processingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </section>
    </dialog>
  );
};

export default ConfirmationDialog;
