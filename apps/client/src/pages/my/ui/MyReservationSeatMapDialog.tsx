import { useId } from "react";

import { useNativeDialog } from "@shared/model/use-native-dialog";

import type { VenueDetailResponse } from "@entities/venue";

import { VenueMap } from "@features/venue-map";

interface MyReservationSeatMapDialogProps {
  matchingConcertCount: number;
  isPending: boolean;
  isError: boolean;
  venueDetail?: VenueDetailResponse;
  selectedSeatIds: ReadonlySet<number>;
  reservationSeatCount: number;
  onClose: () => void;
}

const MyReservationSeatMapDialog = ({
  matchingConcertCount,
  isPending,
  isError,
  venueDetail,
  selectedSeatIds,
  reservationSeatCount,
  onClose,
}: MyReservationSeatMapDialogProps) => {
  const titleId = useId();
  const { dialogRef, handleCancel } = useNativeDialog({ onCancel: onClose });
  const matchedSeatCount = selectedSeatIds.size;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto max-h-[92vh] w-[calc(100%-1.5rem)] max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50"
      onCancel={handleCancel}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold text-gray-900">
          예매 좌석 보기
        </h2>
        <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">
          닫기
        </button>
      </div>

      <div className="max-h-[calc(92vh-4rem)] overflow-y-auto p-4 sm:p-6">
        {isPending && (
          <p role="status" className="py-12 text-center text-sm text-gray-600">
            좌석 배치도를 불러오는 중입니다.
          </p>
        )}

        {isError && (
          <p role="alert" className="py-12 text-center text-sm text-red-700">
            좌석 배치도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        {!isPending && !isError && matchingConcertCount === 0 && (
          <p role="alert" className="py-12 text-center text-sm text-gray-600">
            공연장 좌석 배치 정보를 찾을 수 없습니다.
          </p>
        )}

        {!isPending && !isError && matchingConcertCount > 1 && (
          <p role="alert" className="py-12 text-center text-sm text-gray-600">
            콘서트와 공연장 정보를 하나로 특정할 수 없어 좌석 배치도를 확인할 수 없습니다.
          </p>
        )}

        {!isPending && !isError && matchingConcertCount === 1 && venueDetail && (
          <>
            {reservationSeatCount === 0 ? (
              <p role="status" className="mb-3 text-center text-sm text-gray-600">
                예매된 좌석 정보가 없습니다.
              </p>
            ) : matchedSeatCount === 0 ? (
              <p role="alert" className="mb-3 text-center text-sm text-amber-800">
                예매 좌석을 배치도에서 찾지 못했습니다.
              </p>
            ) : matchedSeatCount < reservationSeatCount ? (
              <p role="alert" className="mb-3 text-center text-sm text-amber-800">
                일부 예매 좌석만 배치도에 표시할 수 있습니다.
              </p>
            ) : (
              <p role="status" className="mb-3 text-center text-sm font-medium text-violet-800">
                강조된 좌석 {matchedSeatCount}석이 예매된 좌석입니다.
              </p>
            )}
            <VenueMap venue={venueDetail.venue} venueSeats={venueDetail.venueSeats} className="mt-0 w-full" selectedSeatIds={selectedSeatIds} />
          </>
        )}
      </div>
    </dialog>
  );
};

export default MyReservationSeatMapDialog;
