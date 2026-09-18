import { type KeyboardEvent, type PointerEvent, memo } from "react";

import {
  VENUE_SEAT_HEIGHT,
  VENUE_SEAT_RADIUS,
  VENUE_SEAT_STYLE_MAP,
  VENUE_SEAT_WIDTH,
  type VenueSeatResponse,
  type VenueSeatStatus,
  isHeldSeatStatus,
} from "@entities/venue";

import { isCurrentSeatSelectable } from "../model/venue-map.utils";

interface VenueSeatItemProps {
  seat: VenueSeatResponse;
  status: VenueSeatStatus;
  isSelected: boolean;
  isSeatSelectable: boolean;
  hasSeatStatuses: boolean;
  isHoldMode: boolean;
  isHeld: boolean;
  sectionColor: string;
  ariaLabel: string;
  tabIndex: number;
  onSeatClick: (seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  onSeatKeyDown: (event: KeyboardEvent<SVGElement>, seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  onPointerEnter?: (event: PointerEvent<SVGGElement>, seat: VenueSeatResponse) => void;
  onPointerMove?: (event: PointerEvent<SVGGElement>) => void;
  onPointerLeave?: () => void;
}

const VenueSeatItem = ({
  seat,
  status,
  isSelected,
  isSeatSelectable,
  hasSeatStatuses,
  isHoldMode,
  isHeld,
  sectionColor,
  ariaLabel,
  tabIndex,
  onSeatClick,
  onSeatKeyDown,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
}: VenueSeatItemProps) => {
  return (
    <g
      className={`group ${isSeatSelectable ? "cursor-pointer" : "cursor-not-allowed"} outline-none`}
      role="button"
      tabIndex={tabIndex}
      data-seat-id={seat.id}
      data-seat-status={hasSeatStatuses ? status : undefined}
      data-selected={isSelected}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      aria-disabled={isHoldMode ? !isSeatSelectable : undefined}
      onPointerEnter={(event) => onPointerEnter?.(event, seat)}
      onPointerMove={(event) => {
        if (isHeldSeatStatus(event.currentTarget.dataset.seatStatus as VenueSeatStatus)) onPointerMove?.(event);
      }}
      onPointerLeave={() => onPointerLeave?.()}
      onClick={(event) => onSeatClick(seat, !isHoldMode || isCurrentSeatSelectable(event.currentTarget))}
      onKeyDown={(event) => onSeatKeyDown(event, seat, !isHoldMode || isCurrentSeatSelectable(event.currentTarget))}
    >
      <rect
        data-seat-visual
        x={seat.positionX - VENUE_SEAT_WIDTH / 2}
        y={seat.positionY - VENUE_SEAT_HEIGHT / 2}
        width={VENUE_SEAT_WIDTH}
        height={VENUE_SEAT_HEIGHT}
        rx={VENUE_SEAT_RADIUS}
        fill={hasSeatStatuses ? VENUE_SEAT_STYLE_MAP[status].fill : sectionColor}
        fillOpacity={status === "booked" ? 0.72 : 1}
        stroke={isSelected ? "#312e81" : hasSeatStatuses ? VENUE_SEAT_STYLE_MAP[status].stroke : "transparent"}
        strokeWidth={isSelected ? 1.1 : hasSeatStatuses ? 0.3 : 0}
        className={`transition-[filter] duration-200 group-hover:stroke-violet-700 group-hover:stroke-[1.1] group-data-[selected=true]:stroke-indigo-900 group-data-[selected=true]:stroke-[1.1] ${
          isSeatSelectable || isHeld ? "group-hover:brightness-95" : ""
        }`}
      />
    </g>
  );
};

export default memo(VenueSeatItem);
