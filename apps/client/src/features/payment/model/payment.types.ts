export interface PaymentOrderSeat {
  venueSeatId: number;
  sectionName: string;
  seatLabel: string;
  price: number;
}

export interface PaymentOrder {
  reservationId: number;
  orderId: string;
  orderName: string;
  posterUrl?: string;
  amount: number;
  paymentExpiresAt: string;
  concertTitle: string;
  performanceName: string;
  performanceStartsAt: string;
  venueName: string;
  seats: PaymentOrderSeat[];
}

export interface PaymentCommandFailure {
  code: string;
  message: string;
}

export interface PaymentCommandResponse {
  requestId: string;
  action: string;
  success: boolean;
  data?: unknown;
  error?: PaymentCommandFailure;
}
