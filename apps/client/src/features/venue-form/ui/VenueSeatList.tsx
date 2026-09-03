import { type Dispatch, type SetStateAction, memo } from "react";

import { CircleAlert } from "lucide-react";

import { useVenueSeatList } from "../model/use-venue-seat-list";
import type { VenueFormSeat } from "../model/venue-form.types";
import { getVenueSeatClassName } from "../model/venue-form.utils";
import { ITEMS_PER_ROW, ROW_HEIGHT } from "../model/venue-seat-list.constants";

interface VenueSeatListProps {
  venueSeats: VenueFormSeat[];
  selectedSeatClientIdSet: Set<number>;
  errorSeatClientIds: Set<number>;
  setSelectedSeatClientIds: Dispatch<SetStateAction<number[]>>;
}

const VenueSeatList = ({ venueSeats, selectedSeatClientIdSet, errorSeatClientIds, setSelectedSeatClientIds }: VenueSeatListProps) => {
  const { rowCount, firstVisibleRow, visibleSeats, handleClick, handleScroll } = useVenueSeatList({
    venueSeats,
    selectedSeatClientIdSet,
    errorSeatClientIds,
    setSelectedSeatClientIds,
  });

  return (
    <div
      className={`max-h-64 scrollbar-thin overflow-y-auto rounded-xl border border-slate-200 bg-slate-50`}
      onClick={handleClick}
      onScroll={handleScroll}
    >
      <div
        className="grid content-start gap-2 px-3"
        style={{
          height: rowCount * ROW_HEIGHT + 24,
          paddingTop: firstVisibleRow * ROW_HEIGHT + 12,
          gridTemplateColumns: `repeat(${ITEMS_PER_ROW}, minmax(0, 1fr))`,
        }}
      >
        {visibleSeats.map(({ clientId, seatLabel, isSelected, hasError }) => (
          <button
            key={clientId}
            type="button"
            className={`flex min-w-0 items-center justify-center gap-2 truncate rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${getVenueSeatClassName(hasError, isSelected)}`}
            data-seat-client-id={clientId}
            title={seatLabel.trim() || `좌석 ${clientId}`}
          >
            {hasError && <CircleAlert className="size-3.5 shrink-0 text-red-500" aria-hidden />}
            <span className="truncate">{seatLabel.trim() || `좌석 ${clientId}`}</span>
          </button>
        ))}
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
