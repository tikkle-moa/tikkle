import { type KeyboardEvent, type PointerEvent, memo, useMemo } from "react";

import { type VenueSeatResponse, type VenueSeatState, areSeatIdsEqual } from "@entities/venue";

import VenueSeatChunk from "./VenueSeatChunk";

const VENUE_SEAT_CHUNK_SIZE = 100;

interface VenueSeatLayoutProps {
  venueSeats: VenueSeatResponse[];
  seatLabelById: ReadonlyMap<number, string>;
  sectionColors: Record<string, string>;
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  serverTimeOffset: number;
  visibleSelectedSeatIds?: ReadonlySet<number>;
  selectedSeat: VenueSeatResponse | null;
  onSeatToggle?: (seat: VenueSeatResponse) => void;
  getSeatTabIndex: (seat: VenueSeatResponse) => number;
  handleSeatClick: (seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  handleSeatKeyDown: (event: KeyboardEvent<SVGElement>, seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  handlePointerEnter: (event: PointerEvent<SVGGElement>, seat: VenueSeatResponse) => void;
  handleTooltipPointerMove: (event: PointerEvent<SVGGElement>) => void;
  handlePointerLeave: () => void;
}

const VenueSeatLayout = ({
  venueSeats,
  seatLabelById,
  sectionColors,
  venueSeatStates,
  serverTimeOffset,
  visibleSelectedSeatIds,
  selectedSeat,
  onSeatToggle,
  getSeatTabIndex,
  handleSeatClick,
  handleSeatKeyDown,
  handlePointerEnter,
  handleTooltipPointerMove,
  handlePointerLeave,
}: VenueSeatLayoutProps) => {
  const seatChunks = useMemo(() => {
    const chunks: VenueSeatResponse[][] = [];
    for (let index = 0; index < venueSeats.length; index += VENUE_SEAT_CHUNK_SIZE) {
      chunks.push(venueSeats.slice(index, index + VENUE_SEAT_CHUNK_SIZE));
    }
    return chunks;
  }, [venueSeats]);

  return seatChunks.map((seats) => (
    <VenueSeatChunk
      key={seats[0]?.id}
      venueSeats={seats}
      seatLabelById={seatLabelById}
      sectionColors={sectionColors}
      venueSeatStates={venueSeatStates}
      serverTimeOffset={serverTimeOffset}
      visibleSelectedSeatIds={visibleSelectedSeatIds}
      selectedSeat={selectedSeat}
      isHoldMode={Boolean(onSeatToggle)}
      getSeatTabIndex={getSeatTabIndex}
      handleSeatClick={handleSeatClick}
      handleSeatKeyDown={handleSeatKeyDown}
      handlePointerEnter={handlePointerEnter}
      handleTooltipPointerMove={handleTooltipPointerMove}
      handlePointerLeave={handlePointerLeave}
    />
  ));
};

export default memo(VenueSeatLayout, (previous, next) => {
  const hasSeatStatuses = previous.venueSeatStates !== undefined && next.venueSeatStates !== undefined;

  return (
    previous.venueSeats === next.venueSeats &&
    previous.seatLabelById === next.seatLabelById &&
    previous.sectionColors === next.sectionColors &&
    (hasSeatStatuses || previous.venueSeatStates === next.venueSeatStates) &&
    (hasSeatStatuses || previous.serverTimeOffset === next.serverTimeOffset) &&
    ((previous.visibleSelectedSeatIds !== undefined && next.visibleSelectedSeatIds !== undefined) ||
      areSeatIdsEqual(previous.visibleSelectedSeatIds, next.visibleSelectedSeatIds)) &&
    (previous.visibleSelectedSeatIds !== undefined || previous.selectedSeat === next.selectedSeat) &&
    previous.onSeatToggle === next.onSeatToggle &&
    previous.getSeatTabIndex === next.getSeatTabIndex &&
    previous.handleSeatClick === next.handleSeatClick &&
    previous.handleSeatKeyDown === next.handleSeatKeyDown &&
    previous.handlePointerEnter === next.handlePointerEnter &&
    previous.handleTooltipPointerMove === next.handleTooltipPointerMove &&
    previous.handlePointerLeave === next.handlePointerLeave
  );
});
