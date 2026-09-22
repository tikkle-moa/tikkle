import { useCallback, useEffect, useState } from "react";
import { generatePath, useLocation, useNavigate, useParams } from "react-router";

import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Info, MapPin, Ticket } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";
import DetailMessage from "@shared/ui/DetailMessage";

import { useSessionStore } from "@entities/session";

import {
  clearPerformanceSeatSelectionSession,
  formatBookingAmount,
  getRemainingSeconds,
  isPerformanceCheckoutLocationState,
  useCheckoutReview,
  useStartCheckout,
} from "@features/performance-booking";

const PerformanceCheckoutPage = () => {
  const { performanceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const user = useSessionStore((store) => store.user);
  const id = Number(performanceId);
  const state = isPerformanceCheckoutLocationState(location.state, id) ? location.state : null;
  const performance = state?.performance;
  const venue = state?.venue;
  const venueSeats = state?.venueSeats ?? [];
  const selectedSeatIds = state?.review.venueSeatIds ?? [];
  const selectedSeats = venueSeats.filter((seat) => selectedSeatIds.includes(seat.id));
  const reviewSessionId = state?.review.sessionId;

  useEffect(() => () => clearPerformanceSeatSelectionSession(id), [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCheckoutSuccess = useCallback(
    (reservationId: number) => {
      clearPerformanceSeatSelectionSession(id);
      navigate(generatePath(ROUTE_PATHS.PAYMENT_CHECKOUT, { reservationId: String(reservationId) }));
    },
    [id, navigate],
  );
  const handleReviewEnd = useCallback(
    (canResumeHold: boolean) => {
      if (!canResumeHold) clearPerformanceSeatSelectionSession(id);
      navigate(generatePath(ROUTE_PATHS.PERFORMANCE_DETAIL, { performanceId: String(id) }), {
        replace: true,
        state: canResumeHold && reviewSessionId ? { performanceId: id, seatSelectionSessionId: reviewSessionId } : null,
      });
    },
    [id, navigate, reviewSessionId],
  );
  const {
    errorMessage: reviewErrorMessage,
    isEnding,
    endReview,
  } = useCheckoutReview({
    performanceId: id,
    onEndSuccess: handleReviewEnd,
  });
  const { errorMessage, isStarting, startCheckout } = useStartCheckout({
    performanceId: id,
    reviewToken: state?.review.reviewToken ?? "",
    groupId: state?.review.groupId,
    enabled: Boolean(state),
    onSuccess: handleCheckoutSuccess,
  });

  const handleConfirm = () => startCheckout();

  if (!state || !performance || !venue || selectedSeats.length !== selectedSeatIds.length) {
    return <DetailMessage title="예매 정보를 찾을 수 없습니다." description="공연 상세에서 좌석을 다시 선택해 주세요." />;
  }

  const handleBack = () => endReview(state.review.reviewToken, state.review.groupId);

  const remainingSeconds = getRemainingSeconds(state.review.expiresAt, now);
  const totalAmount = selectedSeats.reduce((total, seat) => total + seat.price, 0);
  return (
    <div className="mx-auto w-full max-w-3xl pb-6">
      <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500" disabled={isEnding} onClick={handleBack}>
        <ArrowLeft className="size-4" aria-hidden />
        {isEnding ? "좌석 선택으로 돌아가는 중..." : "좌석 다시 선택"}
      </button>
      {reviewErrorMessage && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {reviewErrorMessage}
        </p>
      )}
      <header className="mt-5">
        <p className="text-brand-primary text-sm font-semibold">예매 정보 확인</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">예매자와 공연 정보를 확인해 주세요</h1>
        <p className="mt-2 text-sm text-gray-500">예매 정보를 확정하면 결제 준비를 시작합니다.</p>
      </header>
      <div role="note" className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <div>
          <p className="font-bold">결제 준비 전 안내</p>
          <p className="mt-1 leading-5">
            예매 정보를 확정한 좌석은 변경하거나 점유를 해제할 수 없습니다. 결제 화면에서 돌아가도 해당 좌석은 만료 시간까지 유지되며, 다른 좌석을
            새로 선택할 수 있습니다.
          </p>
        </div>
      </div>
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
            {remainingSeconds > 0
              ? `좌석 점유 남은 시간 ${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`
              : "선택 당시 점유 시간이 지났습니다. 확정 요청 시 서버 상태를 다시 확인합니다."}
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
            disabled={isStarting || !user}
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
