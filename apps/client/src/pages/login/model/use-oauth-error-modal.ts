import { type SyntheticEvent, useEffect, useRef } from "react";

interface UseOAuthErrorModalProps {
  onClose: () => void;
}

export const useOAuthErrorModal = ({ onClose }: UseOAuthErrorModalProps) => {
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
