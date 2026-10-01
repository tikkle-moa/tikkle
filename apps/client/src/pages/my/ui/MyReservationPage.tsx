import { Music2 } from "lucide-react";

import { MY_RESERVATION_STATUS_MAP, useMyReservations } from "@entities/reservation";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));

const MyReservationPage = () => {
  const { data: myReservations, isError, isLoading, refetch } = useMyReservations();

  return (
    <section aria-labelledby="my-reservation-page-title" className="mx-auto max-w-screen-sm">
      <h1 id="my-reservation-page-title" className="text-2xl font-bold text-gray-900">
        내 예약
      </h1>

      {isLoading && (
        <p className="mt-4 text-sm text-gray-600" role="status">
          예매 목록을 불러오는 중이에요.
        </p>
      )}

      {isError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
          <p className="text-sm text-rose-800">내 예매 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          <button
            className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-rose-800 ring-1 ring-rose-300 transition hover:bg-rose-100"
            type="button"
            onClick={() => void refetch()}
          >
            다시 시도
          </button>
        </div>
      )}

      {myReservations?.length === 0 && <p className="mt-4 text-sm text-gray-600">예매 내역이 없어요.</p>}

      {myReservations && myReservations.length > 0 && (
        <ul aria-label="예매 목록" className="mt-4 space-y-3">
          {myReservations.map((myReservation) => {
            const status = MY_RESERVATION_STATUS_MAP[myReservation.status];

            return (
              <li className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5" key={myReservation.id}>
                <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50 text-violet-300">
                  <Music2 aria-hidden="true" size={24} />
                  {myReservation.posterUrl && (
                    <img
                      alt={`${myReservation.concertTitle} 포스터`}
                      className="absolute inset-0 h-full w-full object-cover"
                      src={myReservation.posterUrl}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>

                <div className="min-w-0 grow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-gray-900">{myReservation.concertTitle}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-700">{myReservation.performanceName}</p>
                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    <time dateTime={myReservation.performanceStartsAt}>{formatDateTime(myReservation.performanceStartsAt)}</time>
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {myReservation.venueName} · {myReservation.seats.length}석 · {myReservation.amount.toLocaleString("ko-KR")}원
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default MyReservationPage;
