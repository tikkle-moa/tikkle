import { useCallback, useEffect, useState } from "react";
import { generatePath, useLocation, useNavigate, useParams } from "react-router";

import type { VenueSeatHoldDetail } from "@tikkle/api-types";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, Ticket } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";
import DetailMessage from "@shared/ui/DetailMessage";

import { useSessionStore } from "@entities/session";

import type { PerformanceCheckoutLocationState } from "@features/performance-booking";
import { formatBookingAmount, getRemainingSeconds } from "@features/performance-booking/model/performance-booking.utils";
import { useStartCheckout } from "@features/performance-booking/model/use-start-checkout";

import { createPerformanceCheckoutFixture } from "../model/performance-checkout.fixtures";

const isVenueSeatHold = (value: unknown): value is VenueSeatHoldDetail => {
  if (!value || typeof value !== "object") return false;

  const hold = value as Record<string, unknown>;
  return (
    typeof hold.holdId === "string" &&
    typeof hold.groupId === "string" &&
    typeof hold.performanceId === "number" &&
    Array.isArray(hold.venueSeatIds) &&
    hold.venueSeatIds.length > 0 &&
    hold.venueSeatIds.every((seatId) => typeof seatId === "number") &&
    typeof hold.expiresAt === "string"
  );
};

const isPerformance = (value: unknown) => {
  if (!value || typeof value !== "object") return false;

  const performance = value as Record<string, unknown>;
  return (
    typeof performance.id === "number" &&
    typeof performance.venueId === "number" &&
    typeof performance.name === "string" &&
    typeof performance.startsAt === "string"
  );
};

const isVenue = (value: unknown) => {
  if (!value || typeof value !== "object") return false;

  const venue = value as Record<string, unknown>;
  return typeof venue.id === "number" && typeof venue.name === "string";
};

const isVenueSeat = (value: unknown) => {
  if (!value || typeof value !== "object") return false;

  const seat = value as Record<string, unknown>;
  return typeof seat.id === "number" && typeof seat.sectionName === "string" && typeof seat.seatLabel === "string" && typeof seat.price === "number";
};

const isCheckoutLocationState = (state: unknown): state is PerformanceCheckoutLocationState => {
  if (!state || typeof state !== "object") return false;

  const value = state as Partial<PerformanceCheckoutLocationState>;
  return Boolean(
    isPerformance(value.performance) &&
    isVenue(value.venue) &&
    Array.isArray(value.venueSeats) &&
    value.venueSeats.every(isVenueSeat) &&
    isVenueSeatHold(value.hold),
  );
};

interface PerformanceCheckoutPageProps {
  fixture?: boolean;
}

const PerformanceCheckoutPage = ({ fixture = false }: PerformanceCheckoutPageProps) => {
  const { performanceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const user = useSessionStore((store) => store.user);
  const fixtureState = fixture ? createPerformanceCheckoutFixture() : null;
  const state = !fixture && isCheckoutLocationState(location.state) ? location.state : null;
  const performance = fixtureState?.performance ?? state?.performance;
  const venue = fixtureState?.venue ?? state?.venue;
  const venueSeats = fixtureState?.venueSeats ?? state?.venueSeats ?? [];
  const selectedSeatIds = fixtureState?.selectedSeatIds ?? (state ? state.hold.venueSeatIds : []);
  const id = fixtureState?.performance.id ?? Number(performanceId);
  const selectedSeats = venueSeats.filter((seat) => selectedSeatIds.includes(seat.id));

  useEffect(() => {
    if (fixture) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [fixture]);

  const handleCheckoutSuccess = useCallback(
    (reservationId: number) => navigate(generatePath(ROUTE_PATHS.PAYMENT_CHECKOUT, { reservationId: String(reservationId) })),
    [navigate],
  );
  const { errorMessage, isStarting, startCheckout } = useStartCheckout({
    performanceId: id,
    enabled: !fixture,
    onSuccess: handleCheckoutSuccess,
  });

  const handleConfirm = () => {
    if (fixtureState) {
      navigate(generatePath(ROUTE_PATHS.PAYMENT_CHECKOUT, { reservationId: String(fixtureState.paymentOrder.reservationId) }), {
        state: fixtureState.paymentOrder,
      });
      return;
    }

    startCheckout();
  };

  if (
    (!fixture && !state) ||
    !performance ||
    !venue ||
    !Number.isInteger(id) ||
    id <= 0 ||
    performance.id !== id ||
    performance.venueId !== venue.id ||
    selectedSeats.length !== selectedSeatIds.length
  ) {
    return <DetailMessage title="예매 정보를 찾을 수 없습니다." description="공연 상세에서 좌석을 다시 선택해 주세요." />;
  }

  const remainingSeconds = state ? getRemainingSeconds(state.hold.expiresAt, now) : null;
  const totalAmount = selectedSeats.reduce((total, seat) => total + seat.price, 0);
  return (
    <div className="mx-auto w-full max-w-3xl pb-6">
      <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" aria-hidden />
        좌석 다시 선택
      </button>
      <header className="mt-5">
        <p className="text-brand-primary text-sm font-semibold">예매 정보 확인</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">예매자와 공연 정보를 확인해 주세요</h1>
        <p className="mt-2 text-sm text-gray-500">예매 정보를 확정하면 결제 준비를 시작합니다.</p>
      </header>
      <section className="mt-7 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-linear-to-br from-violet-950 via-violet-900 to-fuchsia-900 px-5 py-6 text-white sm:px-7">
          <p className="text-sm font-semibold text-violet-200">공연 정보</p>
          <h2 className="mt-2 text-2xl font-bold">{performance.name}</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-xl bg-white/10 p-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-violet-200" aria-hidden />
              <div>
                <dt className="text-xs text-violet-200">공연 일시</dt>
                <dd className="mt-1 font-semibold">{formatDateTime(performance.startsAt)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-white/10 p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-violet-200" aria-hidden />
              <div>
                <dt className="text-xs text-violet-200">공연장</dt>
                <dd className="mt-1 font-semibold">{venue.name}</dd>
              </div>
            </div>
          </dl>
        </div>
        <div className="p-5 sm:p-7">
          <dl className="rounded-xl bg-gray-50 p-4 text-sm">
            <dt className="font-bold text-gray-900">예매자 정보</dt>
            <dd className="mt-2 text-gray-700">{user ? `${user.nickname} · ${user.email}` : "예매자 정보를 불러오는 중입니다."}</dd>
          </dl>
          <p className="flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950">
            <Clock3 className="size-4" aria-hidden />
            {remainingSeconds === null
              ? "테스트 좌석 선택 정보"
              : `좌석 점유 남은 시간 ${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`}
          </p>
          <ul className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-100">
            {selectedSeats.map((seat) => (
              <li key={seat.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <span className="flex items-center gap-2 font-semibold text-gray-800">
                  <Ticket className="text-brand-primary size-4" aria-hidden />
                  {seat.sectionName} {seat.seatLabel}
                </span>
                <span className="text-sm font-medium text-gray-600">{formatBookingAmount(seat.price)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-end justify-between border-t border-gray-200 pt-5">
            <span className="font-bold text-gray-900">결제 예정 금액</span>
            <span className="text-brand-primary text-2xl font-extrabold">{formatBookingAmount(totalAmount)}</span>
          </div>
          <button
            type="button"
            className="bg-brand-primary mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={remainingSeconds === 0 || isStarting || !user}
            onClick={handleConfirm}
          >
            {isStarting ? "예매 정보 확정 중..." : "예매 정보 확정하기"}
            <ArrowRight className="size-4" aria-hidden />
          </button>
          {errorMessage && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default PerformanceCheckoutPage;
