import { Music2 } from "lucide-react";

import { formatDateTime } from "@shared/lib/date.utils";

import { MY_RESERVATION_STATUS_MAP, type MyReservation } from "@entities/reservation";

interface Props {
  reservation: MyReservation;
}

const ReservationCard = ({ reservation }: Props) => {
  const status = MY_RESERVATION_STATUS_MAP[reservation.status];

  return (
    <li className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50 text-violet-300">
        <Music2 aria-hidden="true" size={24} />
        {reservation.posterUrl && (
          <img
            alt={`${reservation.concertTitle} 포스터`}
            className="absolute inset-0 h-full w-full object-cover"
            src={reservation.posterUrl}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      <div className="min-w-0 grow">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{reservation.concertTitle}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-gray-700">{reservation.performanceName}</p>
        <p className="mt-3 text-sm font-semibold text-gray-900">
          <time dateTime={reservation.performanceStartsAt}>{formatDateTime(reservation.performanceStartsAt)}</time>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          {reservation.venueName} · {reservation.seats.length}석 · {reservation.amount.toLocaleString("ko-KR")}원
        </p>
      </div>
    </li>
  );
};

export default ReservationCard;
