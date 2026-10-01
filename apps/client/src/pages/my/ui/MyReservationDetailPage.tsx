import { type FormEvent, useState } from "react";
import { Link } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";
import DetailMessage from "@shared/ui/DetailMessage";

import MyReservationSkeleton from "./MyReservationSkeleton";

import { MY_RESERVATION_STATUS_LABELS } from "../model/my-reservation-detail.constants";
import { formatReservationAmount } from "../model/my-reservation.utils";
import { useMyReservationDetail } from "../model/use-my-reservation-detail";

const MyReservationDetailPage = () => {
  const { isParamValid, reservation, isPending, isError, isCancelling, handleCancel, cancelReservation } = useMyReservationDetail();
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");

  if (!isParamValid) {
    return <DetailMessage title="예매 정보를 찾을 수 없습니다." description="올바른 예매 번호인지 확인해 주세요." />;
  }

  if (isPending) {
    return <MyReservationSkeleton />;
  }

  if (isError || !reservation) {
    return (
      <div className="mx-auto w-full max-w-screen-sm">
        <DetailMessage title="예매 정보를 불러오지 못했습니다." description="예매 내역이 없거나 잠시 후 다시 시도해 주세요." />
        <div className="mt-4 text-center">
          <Link to={ROUTE_PATHS.MY_RESERVATIONS} className="text-sm font-semibold text-violet-700 hover:underline">
            내 예약 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const isRefundAccountRequired = reservation.status === "REFUND_ACCOUNT_REQUIRED";

  const handleRefundAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void cancelReservation({ bank: bank.trim(), accountNumber: accountNumber.trim(), holderName: holderName.trim() });
  };

  return (
    <section aria-labelledby="reservation-detail-title" className="mx-auto w-full max-w-screen-sm">
      <Link to={ROUTE_PATHS.MY_RESERVATIONS} className="text-sm font-semibold text-violet-700 hover:underline">
        ← 내 예약 목록
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-violet-700">예매 번호 {reservation.id}</p>
            <h1 id="reservation-detail-title" className="mt-2 text-2xl font-bold text-gray-900">
              {reservation.concertTitle}
            </h1>
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
            <dd className="text-right font-medium text-gray-900">
              {reservation.seats.map(({ sectionName, seatLabel }) => `${sectionName} ${seatLabel}`).join(", ") || "좌석 정보 없음"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-gray-500">예매 일시</dt>
            <dd className="text-right font-medium text-gray-900">{formatDateTime(reservation.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-gray-500">결제 금액</dt>
            <dd className="text-right font-bold text-gray-900">{formatReservationAmount(reservation.amount)}</dd>
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
    </section>
  );
};

export default MyReservationDetailPage;
