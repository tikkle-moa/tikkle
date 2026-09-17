import { useCurrentTime } from "@shared/model/use-current-time";

import type { VenueSeatResponse, VenueSeatStatus } from "@entities/venue";

import { TOOLTIP_POSITION_CLASS_MAP } from "../model/venue-map.constants";
import type { TooltipPlacement } from "../model/venue-map.types";
import { getSeatStatusMessage } from "../model/venue-map.utils";

interface VenueMapSeatTooltipProps {
  seat: VenueSeatResponse;
  status: VenueSeatStatus;
  expiresAt?: Date;
  serverTimeOffset: number;
  placement: TooltipPlacement;
}

const VenueMapSeatTooltip = ({ seat, status, expiresAt, serverTimeOffset, placement }: VenueMapSeatTooltipProps) => {
  const currentTime = useCurrentTime();

  return (
    <div
      className={`pointer-events-none absolute z-10 max-w-[calc(100%-4.5rem)] rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-white shadow-lg shadow-slate-950/20 ${TOOLTIP_POSITION_CLASS_MAP[placement]}`}
      role="tooltip"
    >
      <p className="truncate text-xs font-extrabold">
        {seat.seatLabel} · {seat.price.toLocaleString()}원
      </p>
      <p className="mt-0.5 truncate text-[11px] text-slate-300">
        {getSeatStatusMessage(status, expiresAt, currentTime, serverTimeOffset).description}
      </p>
    </div>
  );
};

export default VenueMapSeatTooltip;
