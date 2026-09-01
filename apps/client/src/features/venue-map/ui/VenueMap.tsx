import { useMemo } from "react";

import { Info, Minus, Plus } from "lucide-react";

import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

import { useVenueMap } from "../model/use-venue-map";
import { createSectionColorMap } from "../model/venue-map.constants";

interface VenueMapProps {
  venue: VenueResponse;
  seats: VenueSeatResponse[];
}

const VenueMap = ({ venue, seats }: VenueMapProps) => {
  const {
    mapRef,
    selectedSeat,
    selectSeat,
    handleSeatKeyDown,
    viewBox,
    zoom,
    isDragging,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    consumeSeatClick,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useVenueMap({
    width: venue.width,
    height: venue.height,
  });

  const sections = useMemo(() => [...new Set(seats.map((seat) => seat.sectionName))], [seats]);
  const sectionColors = useMemo(() => createSectionColorMap(venue.id, sections), [venue.id, sections]);
  const stageX = venue.stagePositionX - venue.stageWidth / 2;
  const stageY = venue.stagePositionY - venue.stageHeight / 2;
  const stageFontSize = Math.min(venue.stageHeight * 0.48, venue.stageWidth / 7);
  const unit = Math.min(venue.width, venue.height);
  const seatSize = unit * 0.012;
  const seatCornerRadius = seatSize * 0.22;
  const hitSize = seatSize + unit * 0.003;

  return (
    <section className="mt-6 w-full">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-gray-900">좌석 배치 정보</h2>
          <p className="mt-1 text-xs text-gray-500">
            {venue.name} · 전체 {seats.length}석
          </p>
        </div>

        <div className="px-3 py-5 sm:px-8 sm:py-7">
          <div ref={mapRef} className="relative" style={{ touchAction: "none" }}>
            <svg
              aria-label={`${venue.name} 좌석 배치도`}
              className={`w-full rounded-xl bg-linear-to-b from-violet-50/70 via-white to-sky-50/70 ring-1 ring-gray-100 ${
                zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
              }`}
              viewBox={viewBox}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <rect
                x={stageX}
                y={stageY}
                width={venue.stageWidth}
                height={venue.stageHeight}
                rx={venue.stageHeight / 2}
                className="fill-violet-200 stroke-violet-300"
                strokeWidth={0.4}
              />
              <text
                x={venue.stagePositionX}
                y={venue.stagePositionY}
                dominantBaseline="middle"
                textAnchor="middle"
                className="fill-violet-700"
                fontSize={stageFontSize}
                fontWeight={700}
                letterSpacing={stageFontSize * 0.24}
              >
                STAGE
              </text>

              {seats.map((seat) => {
                const isSelected = selectedSeat?.id === seat.id;

                return (
                  <g key={seat.id}>
                    <rect
                      x={seat.positionX - seatSize / 2}
                      y={seat.positionY - seatSize / 2}
                      width={seatSize}
                      height={seatSize}
                      rx={seatCornerRadius}
                      fill={sectionColors[seat.sectionName]}
                      stroke={isSelected ? "#312E81" : "transparent"}
                      strokeWidth={isSelected ? unit * 0.003 : 0}
                    />
                    <rect
                      x={seat.positionX - hitSize / 2}
                      y={seat.positionY - hitSize / 2}
                      width={hitSize}
                      height={hitSize}
                      fill="transparent"
                      pointerEvents="all"
                      role="button"
                      tabIndex={0}
                      aria-label={`${seat.seatLabel}, ${seat.price.toLocaleString()}원`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (!consumeSeatClick()) {
                          selectSeat(seat);
                        }
                      }}
                      onKeyDown={(event) => handleSeatKeyDown(event, seat)}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-600" aria-label="구역 색상">
              {sections.map((sectionName) => (
                <span key={sectionName} className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: sectionColors[sectionName] }} />
                  {sectionName}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs text-gray-500" aria-live="polite">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {selectedSeat ? (
                <p>
                  {selectedSeat.seatLabel} · {selectedSeat.sectionName} · {selectedSeat.price.toLocaleString()}원
                </p>
              ) : (
                <p>Option + 스크롤 또는 두 손가락으로 확대할 수 있습니다. 확대 후 드래그하여 이동하세요.</p>
              )}
            </div>
            <div
              role="group"
              aria-label="좌석 배치도 확대 제어"
              className="absolute top-3 right-3 flex items-center overflow-hidden rounded-md border border-gray-200 bg-white/90 text-gray-600 shadow-sm backdrop-blur"
            >
              <button
                type="button"
                aria-label="축소"
                className="p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                disabled={!canZoomOut}
                onClick={zoomOut}
              >
                <Minus className="size-3.5" aria-hidden />
              </button>

              <output aria-label="현재 확대 비율" className="min-w-11 border-x border-gray-200 px-1 text-center text-xs font-semibold">
                {Math.round(zoom * 100)}%
              </output>

              <button
                type="button"
                aria-label="확대"
                className="p-1.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                disabled={!canZoomIn}
                onClick={zoomIn}
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VenueMap;
