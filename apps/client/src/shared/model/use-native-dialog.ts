import { type SyntheticEvent, useEffect, useRef } from "react";

interface UseNativeDialogProps {
  onCancel: () => void;
}

export const useNativeDialog = ({ onCancel }: UseNativeDialogProps) => {
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
    onCancel();
  };

  return { dialogRef, handleCancel };
};
