import { formatDateTime } from "@shared/lib/date.utils";
import { formatPrice } from "@shared/lib/number.utils";
import ConfirmationDialog from "@shared/ui/ConfirmationDialog";
import DetailMessage from "@shared/ui/DetailMessage";

import { ReservationPoster } from "@entities/reservation";

import MyReservationSeatMapDialog from "./MyReservationSeatMapDialog";
import MyReservationSkeleton from "./MyReservationSkeleton";

import { MY_RESERVATION_STATUS_LABELS } from "../model/my-reservation-detail.constants";
import { useMyReservationDetail } from "../model/use-my-reservation-detail";
import { useMyReservationSeatMap } from "../model/use-my-reservation-seat-map";

const MyReservationDetailPage = () => {
  const {
    isParamValid,
    reservation,
    isPending,
    isCancelling,
    isCancelConfirmationOpen,
    handleCancel,
    handleConfirmCancel,
    handleDismissCancel,
    bank,
    setBank,
    accountNumber,
    setAccountNumber,
    holderName,
    setHolderName,
    handleRefundAccountSubmit,
    handleBackToReservations,
  } = useMyReservationDetail();
  const seatMap = useMyReservationSeatMap(reservation);

  if (!isParamValid) {
    return <DetailMessage title="예매 정보를 찾을 수 없습니다." description="올바른 예매 번호인지 확인해 주세요." />;
  }

  if (isPending) {
    return <MyReservationSkeleton />;
  }

  if (!reservation) {
    return (
      <div className="mx-auto w-full max-w-screen-sm">
        <DetailMessage title="예매 정보를 불러오지 못했습니다." description="예매 내역이 없거나 잠시 후 다시 시도해 주세요." />
        <div className="mt-4 text-center">
          <button type="button" onClick={handleBackToReservations} className="text-sm font-semibold text-violet-700 hover:underline">
            내 예약 목록으로
          </button>
        </div>
      </div>
    );
  }

  const isRefundAccountRequired = reservation.status === "REFUND_ACCOUNT_REQUIRED";

  return (
    <section aria-labelledby="reservation-detail-title" className="mx-auto w-full max-w-screen-sm">
      <button type="button" onClick={handleBackToReservations} className="text-sm font-semibold text-violet-700 hover:underline">
        ← 내 예약 목록
      </button>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-4">
            <ReservationPoster concertTitle={reservation.concertTitle} posterUrl={reservation.posterUrl} />
            <div className="min-w-0">
              <h1 id="reservation-detail-title" className="text-2xl font-bold text-gray-900">
                {reservation.concertTitle}
              </h1>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
            {MY_RESERVATION_STATUS_LABELS[reservation.status]}
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-600">{reservation.performanceName}</p>

        <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100 text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-gray-500">공연 일시</dt>
            <dd className="text-right font-medium text-gray-900">{formatDateTime(reservation.performanceStartsAt)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-gray-500">공연장</dt>
            <dd className="text-right font-medium text-gray-900">{reservation.venueName}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-gray-500">좌석</dt>
            <dd className="flex flex-col items-end gap-2 text-right font-medium text-gray-900">
              <span>{reservation.seats.map(({ sectionName, seatLabel }) => `${sectionName} ${seatLabel}`).join(", ") || "좌석 정보 없음"}</span>
              <button type="button" onClick={seatMap.open} className="text-sm font-semibold text-violet-700 hover:underline">
                좌석 보기
              </button>
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-gray-500">예매 일시</dt>
            <dd className="text-right font-medium text-gray-900">{formatDateTime(reservation.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-gray-500">결제 금액</dt>
            <dd className="text-right font-bold text-gray-900">{formatPrice(reservation.amount)}</dd>
          </div>
        </dl>

        {reservation.status === "SUCCEEDED" && (
          <button
            type="button"
            disabled={isCancelling}
            onClick={handleCancel}
            className="mt-6 w-full rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
          >
            {isCancelling ? "취소 처리 중..." : "예매 취소"}
          </button>
        )}

        {reservation.status === "CANCELLATION_PENDING" && (
          <p role="status" className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            예매 취소 결과를 확인하고 있어요. 잠시 후 상태를 다시 확인해 주세요.
          </p>
        )}

        {isRefundAccountRequired && (
          <form className="mt-6 space-y-3 rounded-lg bg-amber-50 p-4" onSubmit={handleRefundAccountSubmit}>
            <div>
              <h2 className="font-semibold text-gray-900">환불 계좌 입력</h2>
              <p className="mt-1 text-sm text-gray-600">은행 코드와 환불받을 계좌 정보를 입력해 주세요.</p>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              은행 코드
              <input
                required
                maxLength={20}
                value={bank}
                onChange={(event) => setBank(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              계좌번호
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{1,20}"
                maxLength={20}
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              예금주
              <input
                required
                maxLength={60}
                value={holderName}
                onChange={(event) => setHolderName(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <button
              type="submit"
              disabled={isCancelling}
              className="bg-brand-primary w-full rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {isCancelling ? "환불을 요청하는 중..." : "환불 계좌 제출"}
            </button>
          </form>
        )}
      </div>
      {isCancelConfirmationOpen && (
        <ConfirmationDialog
          title="예매를 취소할까요?"
          message="예매 취소를 요청하면 처리 결과를 이 화면에서 확인할 수 있어요."
          cancelLabel="취소하지 않기"
          confirmLabel="예매 취소"
          onCancel={handleDismissCancel}
          onConfirm={handleConfirmCancel}
        />
      )}
      {seatMap.isOpen && (
        <MyReservationSeatMapDialog
          matchingConcertCount={seatMap.matchingConcertCount}
          isPending={seatMap.isPending}
          isError={seatMap.isError}
          venueDetail={seatMap.venueDetail}
          selectedSeatIds={seatMap.selectedSeatIds}
          reservationSeatCount={seatMap.reservationSeatCount}
          onClose={seatMap.close}
        />
      )}
    </section>
  );
};

export default MyReservationDetailPage;
