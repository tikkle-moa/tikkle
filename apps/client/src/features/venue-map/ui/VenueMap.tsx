import { memo, useMemo } from "react";

import { SEAT_STATUS_LEGEND, type VenueResponse, type VenueSeatResponse, type VenueSeatState } from "@entities/venue";

import VenueMapCanvas from "./VenueMapCanvas";

import { createSectionColorMap } from "../model/venue-map.utils";

interface VenueMapProps {
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  className?: string;
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  serverTimeOffset?: number;
  selectedSeatIds?: ReadonlySet<number>;
  onSeatToggle?: (seat: VenueSeatResponse) => void;
  onSeatSelectionChange?: (seatIds: ReadonlySet<number>) => void;
}

const VenueMap = ({
  venue,
  venueSeats,
  className = "mt-6 w-full",
  venueSeatStates,
  serverTimeOffset = 0,
  selectedSeatIds,
  onSeatToggle,
  onSeatSelectionChange,
}: VenueMapProps) => {
  const sections = useMemo(() => [...new Set(venueSeats.map((seat) => seat.sectionName))], [venueSeats]);
  const sectionColors = useMemo(() => createSectionColorMap(venue.id, sections), [venue.id, sections]);

  return (
    <section className={className}>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
        <div className="flex flex-col items-start gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <span className="grid grid-cols-2 gap-0.5" aria-hidden>
                <span className="size-1.5 rounded-xs bg-emerald-300" />
                <span className="size-1.5 rounded-xs bg-emerald-300" />
                <span className="size-1.5 rounded-xs bg-violet-300" />
                <span className="size-1.5 rounded-xs bg-fuchsia-300" />
              </span>
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-950">좌석 배치 정보</h2>
              <p className="mt-0.5 truncate text-xs text-slate-500">{venue.name}</p>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end">
            {venueSeatStates && (
              <div aria-label="좌석 상태 안내" className="flex min-w-0 items-center justify-end gap-3">
                {SEAT_STATUS_LEGEND.map(([status, { label, style }]) => (
                  <span key={status} className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-500">
                    <span aria-hidden className={`size-2.5 shrink-0 rounded-sm border ${style}`} />
                    <span className="whitespace-nowrap">{label}</span>
                  </span>
                ))}
              </div>
            )}

            {selectedSeatIds && selectedSeatIds.size > 0 && onSeatSelectionChange && (
              <button
                type="button"
                className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-bold text-violet-700 transition hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
                onClick={() => onSeatSelectionChange?.(new Set())}
              >
                전체 선택 해제
              </button>
            )}

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">전체 {venueSeats.length}석</span>
          </div>
        </div>

        <VenueMapCanvas
          venue={venue}
          venueSeats={venueSeats}
          sections={sections}
          sectionColors={sectionColors}
          venueSeatStates={venueSeatStates}
          serverTimeOffset={serverTimeOffset}
          selectedSeatIds={selectedSeatIds}
          onSeatToggle={onSeatToggle}
          onSeatSelectionChange={onSeatSelectionChange}
        />
      </div>
    </section>
  );
};

export default memo(VenueMap);
