import { type KeyboardEvent, type PointerEvent, memo } from "react";

import { type VenueSeatResponse, type VenueSeatState, isHeldSeatStatus } from "@entities/venue";

import VenueSeatItem from "./VenueSeatItem";

import { getSeatStatusMessage } from "../model/venue-map.utils";

interface VenueSeatChunkProps {
  venueSeats: VenueSeatResponse[];
  seatLabelById: ReadonlyMap<number, string>;
  sectionColors: Record<string, string>;
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  serverTimeOffset: number;
  visibleSelectedSeatIds?: ReadonlySet<number>;
  selectedSeat: VenueSeatResponse | null;
  isHoldMode: boolean;
  getSeatTabIndex: (seat: VenueSeatResponse) => number;
  handleSeatClick: (seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  handleSeatKeyDown: (event: KeyboardEvent<SVGElement>, seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  handlePointerEnter: (event: PointerEvent<SVGGElement>, seat: VenueSeatResponse) => void;
  handleTooltipPointerMove: (event: PointerEvent<SVGGElement>) => void;
  handlePointerLeave: () => void;
}

const VenueSeatChunk = ({
  venueSeats,
  seatLabelById,
  sectionColors,
  venueSeatStates,
  serverTimeOffset,
  visibleSelectedSeatIds,
  selectedSeat,
  isHoldMode,
  getSeatTabIndex,
  handleSeatClick,
  handleSeatKeyDown,
  handlePointerEnter,
  handleTooltipPointerMove,
  handlePointerLeave,
}: VenueSeatChunkProps) => {
  const statusMessageByKey = new Map<string, string>();

  return venueSeats.map((seat) => {
    const { status, expiresAt } = venueSeatStates?.get(seat.id) ?? { status: "available" };
    const isSelected = visibleSelectedSeatIds ? visibleSelectedSeatIds.has(seat.id) : selectedSeat?.id === seat.id;
    const isSeatSelectable = !isHoldMode || status === "available" || status === "held_by_my_group";
    const isHeld = isHeldSeatStatus(status);
    const statusKey = `${status}:${expiresAt?.getTime() ?? ""}:${isHeld ? serverTimeOffset : 0}`;
    let statusMessage = statusMessageByKey.get(statusKey);
    if (statusMessage === undefined) {
      statusMessage = getSeatStatusMessage(status, expiresAt, undefined, isHeld ? serverTimeOffset : 0);
      statusMessageByKey.set(statusKey, statusMessage);
    }
    const seatLabel = seatLabelById.get(seat.id) ?? seat.seatLabel;

    return (
      <VenueSeatItem
        key={seat.id}
        seat={seat}
        status={status}
        isSelected={isSelected}
        isSeatSelectable={isSeatSelectable}
        hasSeatStatuses={Boolean(venueSeatStates)}
        isHoldMode={isHoldMode}
        isHeld={isHeld}
        sectionColor={sectionColors[seat.sectionName]}
        ariaLabel={venueSeatStates ? `${seatLabel}, ${statusMessage}` : seatLabel}
        tabIndex={getSeatTabIndex(seat)}
        onSeatClick={handleSeatClick}
        onSeatKeyDown={handleSeatKeyDown}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handleTooltipPointerMove}
        onPointerLeave={handlePointerLeave}
      />
    );
  });
};

export default memo(VenueSeatChunk, (previous, next) => {
  if (
    previous.venueSeats !== next.venueSeats ||
    previous.seatLabelById !== next.seatLabelById ||
    previous.serverTimeOffset !== next.serverTimeOffset ||
    previous.isHoldMode !== next.isHoldMode ||
    previous.handleSeatClick !== next.handleSeatClick ||
    previous.handleSeatKeyDown !== next.handleSeatKeyDown ||
    previous.handlePointerEnter !== next.handlePointerEnter ||
    previous.handleTooltipPointerMove !== next.handleTooltipPointerMove ||
    previous.handlePointerLeave !== next.handlePointerLeave ||
    Boolean(previous.venueSeatStates) !== Boolean(next.venueSeatStates)
  ) {
    return false;
  }

  return previous.venueSeats.every((seat) => {
    const previousState = previous.venueSeatStates?.get(seat.id) ?? { status: "available" };
    const nextState = next.venueSeatStates?.get(seat.id) ?? { status: "available" };
    const previousExpiresAt = previousState.expiresAt?.getTime();
    const nextExpiresAt = nextState.expiresAt?.getTime();
    const isControlledSelection = previous.visibleSelectedSeatIds !== undefined && next.visibleSelectedSeatIds !== undefined;
    const wasSelected = isControlledSelection ? false : (previous.visibleSelectedSeatIds?.has(seat.id) ?? previous.selectedSeat?.id === seat.id);
    const isSelected = isControlledSelection ? false : (next.visibleSelectedSeatIds?.has(seat.id) ?? next.selectedSeat?.id === seat.id);

    return (
      previousState.status === nextState.status &&
      previousExpiresAt === nextExpiresAt &&
      wasSelected === isSelected &&
      previous.getSeatTabIndex(seat) === next.getSeatTabIndex(seat) &&
      previous.sectionColors[seat.sectionName] === next.sectionColors[seat.sectionName]
    );
  });
});
