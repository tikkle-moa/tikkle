import type { PaymentOrderMessageData } from "@tikkle/api-types";

export interface PaymentOrderState {
  key: string;
  order: PaymentOrderMessageData | null;
  errorMessage: string | null;
  isLoading: boolean;
  isTerminal: boolean;
}
