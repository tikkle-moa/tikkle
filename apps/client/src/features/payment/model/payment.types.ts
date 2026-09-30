import type { CancelPaymentData, ConfirmPaymentData } from "@tikkle/api-types";

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
