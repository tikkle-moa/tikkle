import { type MouseEvent, type UIEvent, useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { VenueFormSeat } from "./venue-form.types";
import { ITEMS_PER_ROW, OVERSCAN_ROWS, ROW_HEIGHT, VIEWPORT_HEIGHT } from "./venue-seat-list.constants";
import type { VenueSeatListItem } from "./venue-seat-list.types";

interface UseVenueSeatListProps {
  venueSeats: VenueFormSeat[];
  selectedSeatClientIdSet: Set<number>;
  errorSeatClientIds: Set<number>;
  setSelectedSeatClientIds: Dispatch<SetStateAction<number[]>>;
}

export const useVenueSeatList = ({ venueSeats, selectedSeatClientIdSet, errorSeatClientIds, setSelectedSeatClientIds }: UseVenueSeatListProps) => {
  const [scrollTop, setScrollTop] = useState(0);

  const orderedSeats = useMemo(() => {
    const errorSeats: VenueSeatListItem[] = [];
    const restSeats: VenueSeatListItem[] = [];

    venueSeats.forEach((seat) => {
      const isSelected = selectedSeatClientIdSet.has(seat.clientId);
      const hasError = errorSeatClientIds.has(seat.clientId);
      if (hasError) {
        errorSeats.push({ ...seat, isSelected, hasError });
      } else {
        restSeats.push({ ...seat, isSelected, hasError });
      }
    });

    return [...errorSeats, ...restSeats];
  }, [venueSeats, errorSeatClientIds, selectedSeatClientIdSet]);

  const rowCount = Math.ceil(orderedSeats.length / ITEMS_PER_ROW);
  const firstVisibleRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const visibleRowCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN_ROWS * 2;
  const lastVisibleRow = Math.min(rowCount, firstVisibleRow + visibleRowCount);
  const visibleSeats = orderedSeats.slice(firstVisibleRow * ITEMS_PER_ROW, lastVisibleRow * ITEMS_PER_ROW);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("button[data-seat-client-id]");
      if (!button || !event.currentTarget.contains(button)) return;

      const clientId = Number(button.dataset.seatClientId);
      if (!Number.isFinite(clientId)) return;

      setSelectedSeatClientIds((current) => {
        if (!event.shiftKey) return [clientId];
        return current.includes(clientId) ? current.filter((selectedClientId) => selectedClientId !== clientId) : [...current, clientId];
      });
    },
    [setSelectedSeatClientIds],
  );

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    rowCount,
    firstVisibleRow,
    visibleSeats,
    handleClick,
    handleScroll,
  };
};
