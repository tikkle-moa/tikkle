import { Link, generatePath } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";
import { formatDateTime } from "@shared/lib/date.utils";
import { formatPrice } from "@shared/lib/number.utils";

import { ReservationPoster } from "@entities/reservation";
import { MY_RESERVATION_STATUS_MAP, type MyReservation } from "@entities/reservation";
import { VenueLocationLink } from "@entities/venue";

interface Props {
  reservation: MyReservation;
  venueAddress?: string;
}

const ReservationCard = ({ reservation, venueAddress }: Props) => {
  const status = MY_RESERVATION_STATUS_MAP[reservation.status];

  return (
    <li className="group relative flex gap-4 rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-violet-300">
      <Link
        aria-label={`${reservation.concertTitle} ${reservation.performanceName} 예매 상세 보기`}
        className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
        to={generatePath(ROUTE_PATHS.MY_RESERVATION_DETAIL, { reservationId: String(reservation.id) })}
        state={{ fromMyReservations: true }}
      />
      <div className="pointer-events-none relative flex w-full gap-4 p-4 sm:p-5">
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
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-gray-600">
            {venueAddress ? (
              <VenueLocationLink searchText={venueAddress} label={reservation.venueName}>
                {reservation.venueName}
              </VenueLocationLink>
            ) : (
              reservation.venueName
            )}
            <span>
              · {reservation.seats.length}석 · {formatPrice(reservation.amount)}
            </span>
          </p>
        </div>
      </div>
    </li>
  );
};

export default ReservationCard;
