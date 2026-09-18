import { createPortal } from "react-dom";

import type { VenueSeatResponse, VenueSeatStatus } from "@entities/venue";

import { useVenueMapTooltipPosition } from "../model/use-venue-map-tooltip-position";
import type { TooltipPosition } from "../model/venue-map.types";

interface VenueMapSeatTooltipProps {
  seat: VenueSeatResponse;
  status: VenueSeatStatus;
  expiresAt?: Date;
  serverTimeOffset: number;
  position: TooltipPosition;
}

const VenueMapSeatTooltip = ({ seat, status, expiresAt, serverTimeOffset, position }: VenueMapSeatTooltipProps) => {
  const { tooltipRef, adjustedPosition, seatStatusMessage } = useVenueMapTooltipPosition({ status, expiresAt, serverTimeOffset, position });

  return createPortal(
    <div
      ref={tooltipRef}
      className="pointer-events-none absolute z-50 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-white shadow-lg shadow-slate-950/20"
      role="tooltip"
      style={{
        left: adjustedPosition?.left,
        top: adjustedPosition?.top,
        visibility: adjustedPosition ? "visible" : "hidden",
      }}
    >
      <p className="truncate text-xs font-extrabold">
        {seat.seatLabel} · {seat.price.toLocaleString()}원
      </p>
      <p className="mt-0.5 truncate text-[11px] text-slate-300">{seatStatusMessage}</p>
    </div>,
    document.body,
  );
};

export default VenueMapSeatTooltip;
