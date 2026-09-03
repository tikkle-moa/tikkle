import { type MouseEvent, type UIEvent, useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { VenueFormSeat } from "./venue-form.types";
import { ITEMS_PER_ROW, OVERSCAN_ROWS, ROW_HEIGHT, VIEWPORT_HEIGHT } from "./venue-seat-list.constants";

interface UseVenueSeatListProps {
  venueSeats: VenueFormSeat[];
  setSelectedSeatClientIds: Dispatch<SetStateAction<number[]>>;
}

export const useVenueSeatList = ({ venueSeats, setSelectedSeatClientIds }: UseVenueSeatListProps) => {
  const [scrollTop, setScrollTop] = useState(0);
  const rowCount = Math.ceil(venueSeats.length / ITEMS_PER_ROW);
  const firstVisibleRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const visibleRowCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN_ROWS * 2;
  const lastVisibleRow = Math.min(rowCount, firstVisibleRow + visibleRowCount);
  const visibleSeats = venueSeats.slice(firstVisibleRow * ITEMS_PER_ROW, lastVisibleRow * ITEMS_PER_ROW);

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
