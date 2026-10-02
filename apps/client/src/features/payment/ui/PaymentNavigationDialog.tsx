import ConfirmationDialog from "@shared/ui/ConfirmationDialog";

interface PaymentNavigationDialogProps {
  message: string;
  onProceed: () => void;
  onStay: () => void;
}

const PaymentNavigationDialog = ({ message, onProceed, onStay }: PaymentNavigationDialogProps) => {
  return (
    <ConfirmationDialog
      title="결제 화면에서 나갈까요?"
      message={message}
      cancelLabel="결제 계속하기"
      confirmLabel="이전 화면으로 이동"
      onCancel={onStay}
      onConfirm={onProceed}
    />
  );
};

export default PaymentNavigationDialog;
