import { useMyReservations } from "@entities/reservation";

import ReservationCard from "./ReservationCard";

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
          {myReservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </ul>
      )}
    </section>
  );
};

export default MyReservationPage;
