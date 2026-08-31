import { Info } from "lucide-react";

import type { VenueResponse, VenueSeatResponse } from "@entities/venue";

import { useVenueMap } from "../model/use-venue-map";

interface VenueMapProps {
  venue: VenueResponse;
  seats: VenueSeatResponse[];
}

const VenueMap = ({ venue, seats }: VenueMapProps) => {
  const { selectedSeat, selectSeat, handleSeatKeyDown } = useVenueMap();

  const stageX = venue.stagePositionX - venue.stageWidth / 2;
  const stageY = venue.stagePositionY - venue.stageHeight / 2;
  const unit = Math.min(venue.width, venue.height);
  const seatRadius = unit * 0.0075;
  const hitSize = unit * 0.026;

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
          <div className="mx-auto max-w-2xl">
            <svg
              aria-label={`${venue.name} 좌석 배치도`}
              className="w-full rounded-xl bg-linear-to-b from-violet-50/70 via-white to-sky-50/70 ring-1 ring-gray-100"
              viewBox={`0 0 ${venue.width} ${venue.height}`}
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
                fontSize={3}
                fontWeight={700}
                letterSpacing={0.8}
              >
                STAGE
              </text>

              {seats.map((seat) => {
                const isSelected = selectedSeat?.id === seat.id;

                return (
                  <g key={seat.id}>
                    <circle cx={seat.positionX} cy={seat.positionY} r={seatRadius} className={isSelected ? "fill-violet-700" : "fill-violet-400"} />
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
                      onClick={() => selectSeat(seat)}
                      onKeyDown={(event) => handleSeatKeyDown(event, seat)}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="mt-4 flex items-start gap-2 text-xs text-gray-500" aria-live="polite">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {selectedSeat ? (
                <p>
                  {selectedSeat.seatLabel} · {selectedSeat.sectionName} · {selectedSeat.price.toLocaleString()}원
                </p>
              ) : (
                <p>좌석을 선택하면 좌석 정보를 확인할 수 있습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VenueMap;
