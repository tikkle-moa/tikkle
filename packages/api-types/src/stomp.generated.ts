/**
 * This file was generated from the Springwolf AsyncAPI document.
 * Source: http://localhost:8080/api/springwolf/docs
 * Do not make direct changes to this file.
 */

export type PerformanceIdGetMinusSeatMinusStatus = PerformanceSeatStatusMessage | StompFailureMessage;
export type PerformanceIdHoldMinusSeats = HoldVenueSeatsMessage | StompFailureMessage;
export type PerformanceIdReleaseMinusSeats = ReleaseVenueSeatsMessage | StompFailureMessage;
export type Performances = ReleaseVenueSeatsCommand | PerformanceSeatStatusCommand | HoldVenueSeatsCommand;
export type ReservationCancelMinusPayment = CancelCheckoutMessage | StompFailureMessage;
export type ReservationConfirmMinusPayment = ConfirmPaymentMessage | StompFailureMessage;
export type ReservationGetMinusPaymentMinusOrder = PaymentOrderMessage | StompFailureMessage;
export type ReservationStartMinusCheckout = StartCheckoutMessage | StompFailureMessage;
export interface PerformanceSeatStatusMessage {
  data: PerformanceSeatStatusMessageData;
  requestId: string;
  success: boolean;
}
export interface PerformanceSeatStatusMessageData {
  bookedSeats: number[];
  heldSeats: HeldSeat[];
  serverTime: string;
}
export interface HeldSeat {
  expiresAt: string;
  id: number;
}
export interface StompFailureMessage {
  error: StompError;
  requestId: string;
  success: boolean;
}
export interface StompError {
  code: string;
  message: string;
}
export interface PerformanceSeatStatusCommand {
  requestId: string;
}
export interface HoldVenueSeatsMessage {
  data: VenueSeatHoldDetail;
  requestId: string;
  success: boolean;
}
export interface VenueSeatHoldDetail {
  expiresAt: string;
  groupId: string;
  holdId: string;
  performanceId: number;
  venueSeatIds: number[];
}
export interface HoldVenueSeatsCommand {
  data: number[];
  requestId: string;
}
export interface ReleaseVenueSeatsMessage {
  data: number[];
  requestId: string;
  success: boolean;
}
export interface ReleaseVenueSeatsCommand {
  data: number[];
  requestId: string;
}
export interface CancelCheckoutMessage {
  data: CancelCheckoutMessageData;
  requestId: string;
  success: boolean;
}
export interface CancelCheckoutMessageData {
  reservationId: number;
  reservedStatus: ReservationStatus;
}
export enum ReservationStatus {
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAYMENT_CONFIRMING = "PAYMENT_CONFIRMING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
  REFUND_REQUIRED = "REFUND_REQUIRED",
  REFUNDED = "REFUNDED",
}
export interface CancelPaymentCommand {
  data: CancelPaymentData;
  requestId: string;
}
export interface CancelPaymentData {
  reservationId: number;
}
export interface ConfirmPaymentMessage {
  data: ConfirmPaymentMessageData;
  requestId: string;
  success: boolean;
}
export interface ConfirmPaymentMessageData {
  reservationId: number;
  reservedStatus: ReservationStatus;
}
export interface ConfirmPaymentCommand {
  data: ConfirmPaymentData;
  requestId: string;
}
export interface ConfirmPaymentData {
  amount: number;
  orderId: string;
  paymentKey: string;
}
export interface PaymentOrderMessage {
  data: PaymentOrderMessageData;
  requestId: string;
  success: boolean;
}
export interface PaymentOrderMessageData {
  amount: number;
  concertTitle: string;
  orderId: string;
  orderName: string;
  paymentExpiresAt: string;
  performanceName: string;
  performanceStartsAt: string;
  posterUrl: string | null;
  reservationId: number;
  seats: PaymentOrderSeatData[];
  venueName: string;
}
export interface PaymentOrderSeatData {
  price: number;
  seatLabel: string;
  sectionName: string;
  venueSeatId: number;
}
export interface GetPaymentOrderCommand {
  data: GetPaymentOrderData;
  requestId: string;
}
export interface GetPaymentOrderData {
  reservationId: number;
}
export interface StartCheckoutMessage {
  data: StartCheckoutMessageData;
  requestId: string;
  success: boolean;
}
export interface StartCheckoutMessageData {
  amount: number;
  orderId: string;
  orderName: string;
  paymentExpiresAt: string;
  reservationId: number;
}
export interface StartCheckoutCommand {
  data: StartCheckoutData;
  requestId: string;
}
export interface StartCheckoutData {
  performanceId: number;
}
