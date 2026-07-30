import { type SyntheticEvent, useEffect, useRef } from "react";

export const useOAuthErrorModal = (onClose: () => void) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog?.open) {
      dialog?.showModal();
    }
  }, []);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  return {
    dialogRef,
    handleCancel,
  };
};
