import type { components } from "@tikkle/api-types";

export const MY_RESERVATION_STATUS_LABELS: Record<components["schemas"]["ReservationStatus"], string> = {
  PAYMENT_PENDING: "결제 대기",
  PAYMENT_CONFIRMING: "결제 확인 중",
  CANCELLATION_PENDING: "취소 처리 중",
  REFUND_ACCOUNT_REQUIRED: "환불 계좌 입력 필요",
  SUCCEEDED: "결제 완료",
  FAILED: "결제 실패",
  CANCELLED: "취소됨",
  EXPIRED: "기간 만료",
  REFUND_REQUIRED: "환불 대기",
  REFUNDED: "환불 완료",
};

export const MY_RESERVATION_QUERY_KEYS = {
  detail: (reservationId: number) => ["my-reservation", reservationId] as const,
};
