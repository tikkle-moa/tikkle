import { type Dispatch, type SetStateAction, memo } from "react";

import { CircleAlert } from "lucide-react";

import { useVenueSeatList } from "../model/use-venue-seat-list";
import type { VenueFormSeat } from "../model/venue-form.types";
import { getVenueSeatClassName } from "../model/venue-form.utils";
import { ITEMS_PER_ROW, ROW_HEIGHT, VIEWPORT_HEIGHT } from "../model/venue-seat-list.constants";

interface VenueSeatListProps {
  venueSeats: VenueFormSeat[];
  selectedSeatClientIdSet: Set<number>;
  errorSeatClientIds: Set<number>;
  setSelectedSeatClientIds: Dispatch<SetStateAction<number[]>>;
}

const VenueSeatList = ({ venueSeats, selectedSeatClientIdSet, errorSeatClientIds, setSelectedSeatClientIds }: VenueSeatListProps) => {
  const { rowCount, firstVisibleRow, visibleSeats, handleClick, handleScroll } = useVenueSeatList({ venueSeats, setSelectedSeatClientIds });

  return (
    <div
      className={`max-h-[${VIEWPORT_HEIGHT}px] scrollbar-thin overflow-y-auto rounded-xl border border-slate-200 bg-slate-50`}
      onClick={handleClick}
      onScroll={handleScroll}
    >
      <div
        className={`grid grid-cols-${ITEMS_PER_ROW} content-start gap-2 px-3`}
        style={{ height: rowCount * ROW_HEIGHT + 24, paddingTop: firstVisibleRow * ROW_HEIGHT + 12 }}
      >
        {visibleSeats.map((seat) => {
          const isSelected = selectedSeatClientIdSet.has(seat.clientId);
          const hasError = errorSeatClientIds.has(seat.clientId);

          return (
            <button
              key={seat.clientId}
              type="button"
              className={`flex min-w-0 items-center justify-center gap-2 truncate rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${getVenueSeatClassName(hasError, isSelected)}`}
              data-seat-client-id={seat.clientId}
              title={seat.seatLabel.trim() || `좌석 ${seat.clientId}`}
            >
              {hasError && <CircleAlert className="size-3.5 shrink-0 text-red-500" aria-hidden />}
              <span className="truncate">{seat.seatLabel.trim() || `좌석 ${seat.clientId}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(VenueSeatList, (prev, next) => {
  if (
    prev.selectedSeatClientIdSet !== next.selectedSeatClientIdSet ||
    prev.errorSeatClientIds !== next.errorSeatClientIds ||
    prev.setSelectedSeatClientIds !== next.setSelectedSeatClientIds ||
    prev.venueSeats.length !== next.venueSeats.length
  ) {
    return false;
  }

  return prev.venueSeats.every((seat, index) => {
    const nextSeat = next.venueSeats[index];
    return seat.clientId === nextSeat.clientId && seat.seatLabel === nextSeat.seatLabel;
  });
});
