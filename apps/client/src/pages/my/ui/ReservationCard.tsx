import { Link, generatePath } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";
import { formatPrice } from "@shared/lib/number.utils";

import { ReservationPoster } from "@entities/reservation";
import { MY_RESERVATION_STATUS_MAP, type MyReservation } from "@entities/reservation";

interface Props {
  reservation: MyReservation;
}

const ReservationCard = ({ reservation }: Props) => {
  const status = MY_RESERVATION_STATUS_MAP[reservation.status];

  return (
    <li>
      <Link
        className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-violet-300 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none sm:p-5"
        to={generatePath(ROUTE_PATHS.MY_RESERVATION_DETAIL, { reservationId: String(reservation.id) })}
        state={{ fromMyReservations: true }}
      >
        <ReservationPoster concertTitle={reservation.concertTitle} posterUrl={reservation.posterUrl} />

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
            {reservation.venueName} · {reservation.seats.length}석 · {formatPrice(reservation.amount)}
          </p>
        </div>
      </Link>
    </li>
  );
};

export default ReservationCard;
