import { useNavigate } from "react-router";

import { ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { PAYMENT_FIXTURE_RESERVATION_ID, createPaymentCheckoutFixture, createPaymentOrderFixture, formatPaymentAmount } from "@features/payment";

const PaymentFixtureCheckoutPage = () => {
  const navigate = useNavigate();
  const order = createPaymentOrderFixture(PAYMENT_FIXTURE_RESERVATION_ID);

  const handleStartCheckout = () => {
    navigate(ROUTE_PATHS.PAYMENT_FIXTURE, { state: createPaymentCheckoutFixture() });
  };

  return (
    <div className="mx-auto w-full max-w-3xl pb-6">
      <header>
        <p className="text-brand-primary text-sm font-semibold">결제 준비</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">선택한 공연과 좌석을 확인해 주세요</h1>
        <p className="mt-2 text-sm text-gray-500">공연 정보를 확인하고 결제를 준비하면 다음 단계에서 결제수단을 선택할 수 있습니다.</p>
      </header>

      <section className="mt-7 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-linear-to-br from-violet-950 via-violet-900 to-fuchsia-900 px-5 py-6 text-white sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row">
            <img
              src={order.posterUrl}
              alt={`${order.concertTitle} 포스터`}
              className="h-40 w-28 rounded-xl object-cover shadow-lg ring-1 ring-white/20"
            />
            <div className="min-w-0 grow">
              <p className="text-sm font-semibold text-violet-200">공연 정보</p>
              <h2 className="mt-2 text-2xl font-bold">{order.concertTitle}</h2>
              <p className="mt-1 text-sm text-violet-100">{order.performanceName}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-xl bg-white/10 p-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-violet-200" aria-hidden />
                  <div>
                    <dt className="text-xs text-violet-200">공연 일시</dt>
                    <dd className="mt-1 font-semibold">{new Date(order.performanceStartsAt).toLocaleString("ko-KR")}</dd>
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
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {order.seats.map((seat) => (
              <li className="flex items-center justify-between gap-4 px-4 py-3.5" key={seat.venueSeatId}>
                <span className="flex items-center gap-2 font-semibold text-gray-800">
                  <Ticket className="text-brand-primary size-4" aria-hidden />
                  {seat.sectionName} {seat.seatLabel}
                </span>
                <span className="text-sm font-medium text-gray-600">{formatPaymentAmount(seat.price)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-end justify-between border-t border-gray-200 pt-5">
            <span className="font-bold text-gray-900">결제 예정 금액</span>
            <span className="text-brand-primary text-2xl font-extrabold">{formatPaymentAmount(order.amount)}</span>
          </div>

          <button
            className="bg-brand-primary mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-base font-bold text-white transition hover:bg-violet-700"
            onClick={handleStartCheckout}
            type="button"
          >
            결제하러 가기
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
};

export default PaymentFixtureCheckoutPage;
