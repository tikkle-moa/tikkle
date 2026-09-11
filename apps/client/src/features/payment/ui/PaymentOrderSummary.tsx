import { CalendarDays, MapPin, Ticket } from "lucide-react";

import { formatDateTime } from "@shared/lib/date.utils";

import type { PaymentOrder } from "../model/payment.types";
import { formatPaymentAmount } from "../model/payment.utils";

interface PaymentOrderSummaryProps {
  order: PaymentOrder;
}

const PaymentOrderSummary = ({ order }: PaymentOrderSummaryProps) => (
  <section aria-labelledby="payment-order-title" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div className="bg-linear-to-br from-violet-950 via-violet-900 to-fuchsia-900 px-5 py-6 text-white sm:px-7">
      <div className="flex flex-col gap-5 sm:flex-row">
        {order.posterUrl && (
          <img
            src={order.posterUrl}
            alt={`${order.concertTitle} 포스터`}
            className="h-36 w-24 rounded-xl object-cover shadow-lg ring-1 ring-white/20"
          />
        )}
        <div className="min-w-0 grow">
          <p className="text-sm font-semibold text-violet-200">예매 정보</p>
          <h1 id="payment-order-title" className="mt-2 text-2xl font-bold tracking-tight">
            {order.concertTitle}
          </h1>
          <p className="mt-1 text-sm text-violet-100">{order.performanceName}</p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-xl bg-white/10 p-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-violet-200" aria-hidden />
              <div>
                <dt className="text-xs text-violet-200">공연 일시</dt>
                <dd className="mt-1 font-semibold">{formatDateTime(order.performanceStartsAt)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-white/10 p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-violet-200" aria-hidden />
              <div>
                <dt className="text-xs text-violet-200">공연장</dt>
                <dd className="mt-1 font-semibold">{order.venueName}</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <div className="p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">선택 좌석</h2>
        <span className="text-sm text-gray-500">총 {order.seats.length}석</span>
      </div>
      <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
        {order.seats.map((seat) => (
          <li key={seat.venueSeatId} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <span className="flex items-center gap-2 font-semibold text-gray-800">
              <Ticket className="text-brand-primary size-4" aria-hidden />
              {seat.sectionName} {seat.seatLabel}
            </span>
            <span className="text-sm font-medium text-gray-600">{formatPaymentAmount(seat.price)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-6 flex items-end justify-between border-t border-gray-200 pt-5">
        <dt className="font-bold text-gray-900">총 결제 금액</dt>
        <dd className="text-brand-primary text-2xl font-extrabold tracking-tight">{formatPaymentAmount(order.amount)}</dd>
      </dl>
    </div>
  </section>
);

export default PaymentOrderSummary;
