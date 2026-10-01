import type { MyReservationStatus, MyReservationStatusItem } from "./reservation.types";

export const RESERVATION_QUERY_KEYS = {
  all: ["reservations"] as const,
  my: () => [...RESERVATION_QUERY_KEYS.all, "my"] as const,
};

export const MY_RESERVATION_STATUS_MAP: Record<MyReservationStatus, MyReservationStatusItem> = {
  PAYMENT_PENDING: { label: "결제 대기", className: "bg-amber-100 text-amber-800" },
  PAYMENT_CONFIRMING: { label: "결제 확인 중", className: "bg-amber-100 text-amber-800" },
  CANCELLATION_PENDING: { label: "취소 처리 중", className: "bg-amber-100 text-amber-800" },
  REFUND_ACCOUNT_REQUIRED: { label: "환불 계좌 입력 필요", className: "bg-amber-100 text-amber-800" },
  SUCCEEDED: { label: "예매 완료", className: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "예매 실패", className: "bg-rose-100 text-rose-800" },
  CANCELLED: { label: "취소 완료", className: "bg-gray-100 text-gray-700" },
  EXPIRED: { label: "예매 만료", className: "bg-gray-100 text-gray-700" },
  REFUND_REQUIRED: { label: "환불 확인 필요", className: "bg-orange-100 text-orange-800" },
  REFUNDED: { label: "환불 완료", className: "bg-gray-100 text-gray-700" },
};
