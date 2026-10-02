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

import { HIGHLIGHTED_SEAT_COLOR } from "../model/venue-map.constants";
import { isCurrentSeatSelectable } from "../model/venue-map.utils";

interface VenueSeatItemProps {
  seat: VenueSeatResponse;
  status: VenueSeatStatus;
  isSelected: boolean;
  isSeatSelectable: boolean;
  selectedSeatsOnly: boolean;
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
  selectedSeatsOnly,
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
  const isInteractive = !selectedSeatsOnly || isSelected;
  const selectedSeatHoverStyle = selectedSeatsOnly
    ? isSelected
      ? "group-hover:stroke-violet-700 group-hover:stroke-[1.1]"
      : ""
    : "group-hover:stroke-violet-700 group-hover:stroke-[1.1] group-data-[selected=true]:stroke-indigo-900 group-data-[selected=true]:stroke-[1.1]";
  const hasHoverBrightness = selectedSeatsOnly ? isSelected : isSeatSelectable || isHeld;

  return (
    <g
      className={`group ${isInteractive && isSeatSelectable ? "cursor-pointer" : isInteractive ? "cursor-not-allowed" : "cursor-default"} outline-none`}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? tabIndex : undefined}
      data-seat-id={seat.id}
      data-seat-status={hasSeatStatuses ? status : undefined}
      data-selected={isSelected}
      aria-label={isInteractive ? ariaLabel : undefined}
      aria-pressed={isInteractive ? isSelected : undefined}
      aria-disabled={isInteractive && isHoldMode ? !isSeatSelectable : undefined}
      onPointerEnter={isInteractive ? (event) => onPointerEnter?.(event, seat) : undefined}
      onPointerMove={
        isInteractive
          ? (event) => {
              if (isHeldSeatStatus(event.currentTarget.dataset.seatStatus as VenueSeatStatus)) onPointerMove?.(event);
            }
          : undefined
      }
      onPointerLeave={isInteractive ? () => onPointerLeave?.() : undefined}
      onClick={isInteractive ? (event) => onSeatClick(seat, !isHoldMode || isCurrentSeatSelectable(event.currentTarget)) : undefined}
      onKeyDown={isInteractive ? (event) => onSeatKeyDown(event, seat, !isHoldMode || isCurrentSeatSelectable(event.currentTarget)) : undefined}
    >
      <rect
        data-seat-visual
        x={seat.positionX - VENUE_SEAT_WIDTH / 2}
        y={seat.positionY - VENUE_SEAT_HEIGHT / 2}
        width={VENUE_SEAT_WIDTH}
        height={VENUE_SEAT_HEIGHT}
        rx={VENUE_SEAT_RADIUS}
        fill={selectedSeatsOnly && isSelected ? HIGHLIGHTED_SEAT_COLOR : hasSeatStatuses ? VENUE_SEAT_STYLE_MAP[status].fill : sectionColor}
        fillOpacity={status === "booked" ? 0.72 : 1}
        stroke={isSelected && !selectedSeatsOnly ? "#312e81" : hasSeatStatuses ? VENUE_SEAT_STYLE_MAP[status].stroke : "transparent"}
        strokeWidth={isSelected && !selectedSeatsOnly ? 1.1 : hasSeatStatuses ? 0.3 : 0}
        className={`transition-[filter] duration-200 ${selectedSeatHoverStyle} ${hasHoverBrightness ? "group-hover:brightness-95" : ""}`}
      />
    </g>
  );
};

export default memo(VenueSeatItem);
