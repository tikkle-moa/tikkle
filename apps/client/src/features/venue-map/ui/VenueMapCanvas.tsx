import { memo } from "react";

import type { VenueResponse, VenueSeatResponse, VenueSeatState } from "@entities/venue";

import VenueMapSelectionInfo from "./VenueMapSelectionInfo";
import VenueMapSurface from "./VenueMapSurface";
import VenueMapZoomControls from "./VenueMapZoomControls";

import { useVenueMapCanvas } from "../model/use-venue-map-canvas";

interface VenueMapCanvasProps {
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  sections: string[];
  sectionColors: Record<string, string>;
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  serverTimeOffset: number;
  selectedSeatIds?: ReadonlySet<number>;
  onSeatToggle?: (seat: VenueSeatResponse) => void;
  onSeatSelectionChange?: (seatIds: ReadonlySet<number>) => void;
}

const VenueMapCanvas = ({
  venue,
  venueSeats,
  sections,
  sectionColors,
  venueSeatStates,
  serverTimeOffset,
  selectedSeatIds,
  onSeatToggle,
  onSeatSelectionChange,
}: VenueMapCanvasProps) => {
  const {
    mapRef,
    svgRef,
    selectedSeat,
    selectedSeatStatus,
    viewBox,
    zoom,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    dragSelection,
    getSeatTabIndex,
    handleSeatClick,
    handleSeatKeyDown,
    stageX,
    stageY,
  } = useVenueMapCanvas({
    venue,
    venueSeats,
    venueSeatStates,
    selectedSeatIds,
    onSeatToggle,
    onSeatSelectionChange,
  });

  return (
    <div className="bg-linear-to-b from-slate-50/80 via-white to-violet-50/40 px-3 py-5 sm:px-8 sm:py-7">
      <div ref={mapRef} className="relative" style={{ touchAction: "none" }}>
        <VenueMapSurface
          venue={venue}
          venueSeats={venueSeats}
          sectionColors={sectionColors}
          venueSeatStates={venueSeatStates}
          serverTimeOffset={serverTimeOffset}
          visibleSelectedSeatIds={selectedSeatIds}
          selectedSeat={selectedSeat}
          onSeatToggle={onSeatToggle}
          svgRef={svgRef}
          viewBox={viewBox}
          zoom={zoom}
          dragSelection={dragSelection}
          stageX={stageX}
          stageY={stageY}
          getSeatTabIndex={getSeatTabIndex}
          handleSeatClick={handleSeatClick}
          handleSeatKeyDown={handleSeatKeyDown}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handlePointerCancel={handlePointerCancel}
        />

        {!venueSeatStates && (
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-600" aria-label="구역 색상">
            {sections.map((sectionName) => (
              <span key={sectionName} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: sectionColors[sectionName] }} />
                {sectionName}
              </span>
            ))}
          </div>
        )}

        <VenueMapSelectionInfo
          selectedSeat={selectedSeat}
          selectedSeatIds={selectedSeatIds}
          selectedSeatStatus={selectedSeatStatus}
          expiresAt={selectedSeat ? venueSeatStates?.get(selectedSeat.id)?.expiresAt : undefined}
          serverTimeOffset={serverTimeOffset}
        />

        <VenueMapZoomControls zoom={zoom} canZoomIn={canZoomIn} canZoomOut={canZoomOut} zoomIn={zoomIn} zoomOut={zoomOut} />
      </div>
    </div>
  );
};

export default memo(VenueMapCanvas);
