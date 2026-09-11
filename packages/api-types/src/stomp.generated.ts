/**
 * This file was generated from the Springwolf AsyncAPI document.
 * Source: http://localhost:8080/api/springwolf/docs
 * Do not make direct changes to this file.
 */

export type ReservationSyncCommand = CancelPaymentCommand | ConfirmPaymentCommand | StartCheckoutCommand;
export interface StompCommandSuccess {
  action: string;
  data: Map<string, any>;
  requestId: string;
  success: boolean;
}
export interface PerformanceSyncCommand {
  action?: string;
  data?: PerformanceSyncData;
  requestId?: string;
}
export interface PerformanceSyncData {
  performanceId?: number;
}
export interface CancelPaymentCommand {
  action?: string;
  data?: CancelPaymentData;
  requestId?: string;
}
export interface CancelPaymentData {
  reservationId?: number;
}
export interface ConfirmPaymentCommand {
  action?: string;
  data?: ConfirmPaymentData;
  requestId?: string;
}
export interface ConfirmPaymentData {
  amount?: number;
  orderId?: string;
  paymentKey?: string;
}
export interface StartCheckoutCommand {
  action?: string;
  data?: StartCheckoutData;
  requestId?: string;
}
export interface StartCheckoutData {
  holdId?: string;
}
export interface StompCommandFailure {
  action: string;
  error: StompCommandError;
  requestId: string;
  success: boolean;
}
export interface StompCommandError {
  code: string;
  message: string;
}
