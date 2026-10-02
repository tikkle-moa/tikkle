import type { MyReservationFilterId, MyReservationFilterOption } from "./my-reservation-filter.types";

export const DEFAULT_MY_RESERVATION_FILTER: MyReservationFilterId = "SUCCEEDED";

export const MY_RESERVATION_FILTER_OPTIONS: MyReservationFilterOption[] = [
  { id: "SUCCEEDED", label: "예매 완료", statuses: ["SUCCEEDED"] },
  { id: "ALL", label: "전체", statuses: null },
  { id: "PENDING", label: "대기", statuses: ["PAYMENT_PENDING", "PAYMENT_CONFIRMING"] },
  {
    id: "CANCELLATION_OR_REFUND",
    label: "취소/환불",
    statuses: ["CANCELLATION_PENDING", "REFUND_ACCOUNT_REQUIRED", "CANCELLED", "REFUND_REQUIRED", "REFUNDED"],
  },
  { id: "EXPIRED", label: "예매 만료", statuses: ["EXPIRED"] },
  { id: "FAILED", label: "예매 실패", statuses: ["FAILED"] },
];
