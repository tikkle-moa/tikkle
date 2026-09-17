import type { CancelPaymentData, ConfirmPaymentData, PaymentOrderMessageData } from "@tikkle/api-types";

export interface PaymentOrderState {
  key: string;
  order: PaymentOrderMessageData | null;
  errorMessage: string | null;
  isLoading: boolean;
}

export type PaymentResultRequest =
  | {
      action: "CONFIRM_PAYMENT";
      data: ConfirmPaymentData;
    }
  | {
      action: "CANCEL_PAYMENT";
      data: CancelPaymentData;
    };

export type PaymentResultStatus = "pending" | "succeeded" | "failed";
