import ConfirmationDialog from "@shared/ui/ConfirmationDialog";

interface PerformanceCheckoutNavigationDialogProps {
  errorMessage: string | null;
  isEnding: boolean;
  onProceed: () => void;
  onStay: () => void;
}

const PerformanceCheckoutNavigationDialog = ({ errorMessage, isEnding, onProceed, onStay }: PerformanceCheckoutNavigationDialogProps) => {
  return (
    <ConfirmationDialog
      title="예매 정보 확인을 종료할까요?"
      message="나가면 예매 정보 확인 잠금이 해제됩니다. 좌석 점유는 만료 시간까지 유지되며, 남은 시간은 계속 줄어듭니다."
      cancelLabel="계속 확인하기"
      confirmLabel="나가기"
      processingLabel="좌석 상태 확인 중..."
      isProcessing={isEnding}
      errorMessage={errorMessage}
      onCancel={onStay}
      onConfirm={onProceed}
    />
  );
};

export default PerformanceCheckoutNavigationDialog;
