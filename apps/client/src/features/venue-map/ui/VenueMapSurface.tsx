import { type KeyboardEvent, type PointerEvent, type RefObject, memo } from "react";

import {
  type VenueResponse,
  type VenueSeatResponse,
  type VenueSeatState,
  getVenueStageCornerRadius,
  getVenueStageTitleFontSize,
} from "@entities/venue";

import VenueMapSeatTooltip from "./VenueMapSeatTooltip";
import VenueSeatLayout from "./VenueSeatLayout";

import { useVenueMapSeatDomSync } from "../model/use-venue-map-seat-dom-sync";
import { useVenueMapSeatTooltip } from "../model/use-venue-map-seat-tooltip";
import type { DragSelectionArea } from "../model/venue-map-drag.types";

interface VenueMapSurfaceProps {
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  sectionColors: Record<string, string>;
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  serverTimeOffset: number;
  visibleSelectedSeatIds?: ReadonlySet<number>;
  selectedSeat: VenueSeatResponse | null;
  onSeatToggle?: (seat: number) => void;
  svgRef: RefObject<SVGSVGElement | null>;
  viewBox: string;
  zoom: number;
  dragSelection: DragSelectionArea | null;
  stageX: number;
  stageY: number;
  getSeatTabIndex: (seat: VenueSeatResponse) => number;
  handleSeatClick: (seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  handleSeatKeyDown: (event: KeyboardEvent<SVGElement>, seat: VenueSeatResponse, isSeatSelectable: boolean) => void;
  handlePointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  handlePointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  handlePointerCancel: (event: PointerEvent<SVGSVGElement>) => void;
}

const VenueMapSurface = ({
  venue,
  venueSeats,
  sectionColors,
  venueSeatStates,
  serverTimeOffset,
  visibleSelectedSeatIds,
  selectedSeat,
  onSeatToggle,
  svgRef,
  viewBox,
  zoom,
  dragSelection,
  stageX,
  stageY,
  getSeatTabIndex,
  handleSeatClick,
  handleSeatKeyDown,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
}: VenueMapSurfaceProps) => {
  const seatLabelById = useVenueMapSeatDomSync({
    svgRef,
    venueSeats,
    venueSeatStates,
    serverTimeOffset,
    isHoldMode: Boolean(onSeatToggle),
  });

  const {
    activeSeat,
    activeSeatStatus,
    isTooltipVisible,
    tooltipPosition,
    handlePointerEnter,
    handlePointerMove: handleTooltipPointerMove,
    handlePointerLeave,
  } = useVenueMapSeatTooltip({ venueSeats, venueSeatStates });

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        aria-label={`${venue.name} 좌석 배치도`}
        className={`w-full rounded-2xl bg-linear-to-b from-violet-50/70 via-white to-sky-50/70 shadow-inner ring-1 ring-slate-200/80 select-none ${
          dragSelection ? "cursor-crosshair" : zoom > 1 ? "cursor-grab" : ""
        }`}
        viewBox={viewBox}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <rect
          x={stageX}
          y={stageY}
          width={venue.stageWidth}
          height={venue.stageHeight}
          rx={getVenueStageCornerRadius(venue.stageWidth, venue.stageHeight)}
          className="fill-violet-200 stroke-violet-300"
          strokeWidth={0.4}
        />
        <text
          x={venue.stagePositionX}
          y={venue.stagePositionY}
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-violet-700"
          fontSize={getVenueStageTitleFontSize(venue.stageWidth, venue.stageHeight)}
          fontWeight={700}
        >
          STAGE
        </text>

        <VenueSeatLayout
          venueSeats={venueSeats}
          seatLabelById={seatLabelById}
          sectionColors={sectionColors}
          venueSeatStates={venueSeatStates}
          serverTimeOffset={serverTimeOffset}
          visibleSelectedSeatIds={visibleSelectedSeatIds}
          selectedSeat={selectedSeat}
          onSeatToggle={onSeatToggle}
          getSeatTabIndex={getSeatTabIndex}
          handleSeatClick={handleSeatClick}
          handleSeatKeyDown={handleSeatKeyDown}
          handlePointerEnter={handlePointerEnter}
          handleTooltipPointerMove={handleTooltipPointerMove}
          handlePointerLeave={handlePointerLeave}
        />

        {dragSelection && (
          <rect
            x={Math.min(dragSelection.startX, dragSelection.currentX)}
            y={Math.min(dragSelection.startY, dragSelection.currentY)}
            width={Math.abs(dragSelection.currentX - dragSelection.startX)}
            height={Math.abs(dragSelection.currentY - dragSelection.startY)}
            fill="#8b5cf633"
            pointerEvents="none"
            stroke="#7c3aed"
            strokeDasharray="2 1.5"
            strokeWidth={0.7}
          />
        )}
      </svg>

      {isTooltipVisible && activeSeat && activeSeatStatus && tooltipPosition && (
        <VenueMapSeatTooltip
          seat={activeSeat}
          status={activeSeatStatus}
          expiresAt={venueSeatStates?.get(activeSeat.id)?.expiresAt}
          serverTimeOffset={serverTimeOffset}
          position={tooltipPosition}
        />
      )}
    </div>
  );
};

export default memo(VenueMapSurface);
