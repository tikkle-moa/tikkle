/**
 * This file was generated from the Springwolf AsyncAPI document.
 * Source: http://localhost:8080/api/springwolf/docs
 * Do not make direct changes to this file.
 */

export type PerformanceIdGetMinusMyMinusGroupMinusHolds = GetMyGroupHoldsMessage | StompFailureMessage;

export type PerformanceIdGetMinusSeatMinusStatus = PerformanceSeatStatusMessage | StompFailureMessage;

export type PerformanceIdHoldMinusSeats = HoldVenueSeatsMessage | StompFailureMessage;

export type PerformanceIdReleaseMinusSeats = ReleaseVenueSeatsMessage | StompFailureMessage;

export type ReservationCancelMinusPayment = CancelCheckoutMessage | StompFailureMessage;

export type ReservationConfirmMinusPayment = ConfirmPaymentMessage | StompFailureMessage;

export type ReservationGetMinusPaymentMinusOrder = PaymentOrderMessage | StompFailureMessage;

export type ReservationStartMinusCheckout = StartCheckoutMessage | StompFailureMessage;

export type PerformanceSeatEvent = PerformanceHeldSeatsEvent | PerformanceVenueSeatIdsEvent;

export interface GetMyGroupHoldsMessage {
  data: VenueSeatHoldDetail[];
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

export interface StompFailureMessage {
  error: StompError;
  requestId: string;
  success: boolean;
}

export interface StompError {
  code: string;
  message: string;
}

export interface GetMyGroupHoldsCommand {
  requestId: string;
}

export interface PerformanceSeatStatusMessage {
  data: PerformanceSeatStatusMessageData;
  requestId: string;
  success: boolean;
}

export interface PerformanceSeatStatusMessageData {
  bookedSeatIds: number[];
  heldSeats: HeldSeat[];
  serverTime: string;
}

export interface HeldSeat {
  expiresAt: string;
  id: number;
}

export interface PerformanceSeatStatusCommand {
  requestId: string;
}

export interface HoldVenueSeatsMessage {
  data: VenueSeatHoldDetail;
  requestId: string;
  success: boolean;
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
  status: ReservationStatus;
}

export type ReservationStatus =
  "PAYMENT_PENDING" | "PAYMENT_CONFIRMING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUND_REQUIRED" | "REFUNDED";

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
  status: ReservationStatus;
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

export interface PerformanceHeldSeatsEvent {
  data: HeldSeat[];
  eventId: string;
  occurredAt: string;
  type: PerformanceHeldSeatsEventType;
  version: number;
}

export type PerformanceHeldSeatsEventType = "HELD_SEATS";

export interface PerformanceVenueSeatIdsEvent {
  data: number[];
  eventId: string;
  occurredAt: string;
  type: PerformanceVenueSeatIdsEventType;
  version: number;
}

export type PerformanceVenueSeatIdsEventType = "RELEASED_SEATS" | "RESERVATION_CONFIRMED";

export type PerformanceSeatEventType = PerformanceSeatEvent["type"];
