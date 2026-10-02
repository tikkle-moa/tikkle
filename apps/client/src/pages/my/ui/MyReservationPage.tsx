import ReservationCard from "./ReservationCard";

import { MY_RESERVATION_FILTER_OPTIONS } from "../model/my-reservation-filter.constants";
import { useMyReservation } from "../model/use-my-reservation";

const MyReservationPage = () => {
  const { data: myReservations, filteredReservations, handleFilterChange, isError, isLoading, refetch, selectedFilter } = useMyReservation();

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
        <>
          <div aria-label="예매 상태 필터" className="mt-4 flex flex-wrap gap-2" role="group">
            {MY_RESERVATION_FILTER_OPTIONS.map(({ id, label }) => (
              <button
                aria-pressed={selectedFilter === id}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  selectedFilter === id
                    ? "bg-violet-100 text-violet-800 ring-1 ring-violet-300"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-violet-50"
                }`}
                key={id}
                type="button"
                onClick={() => handleFilterChange(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredReservations.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">선택한 상태의 예매 내역이 없어요.</p>
          ) : (
            <ul aria-label="예매 목록" className="mt-4 space-y-3">
              {filteredReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};

export default MyReservationPage;
