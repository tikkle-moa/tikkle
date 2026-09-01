import type { Dispatch, SetStateAction } from "react";

import { Maximize2, Minus, Move, Plus } from "lucide-react";

import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { useVenueLayoutInteraction } from "../model/use-venue-layout-interaction";
import { useVenueLayoutSelection } from "../model/use-venue-layout-selection";
import type { VenueFormErrors } from "../model/venue-form.types";
import { VENUE_LAYOUT_MIN_ZOOM, VENUE_LAYOUT_ZOOM_FACTOR, VENUE_SEAT_HEIGHT, VENUE_SEAT_WIDTH } from "../model/venue-layout.constants";
import { getLayoutClassName, getSectionColor } from "../model/venue-layout.utils";

interface VenueLayoutEditorProps {
  venue: CreateVenueRequest;
  venueSeats: CreateVenueSeatRequest[];
  selectedSeatIndices: number[];
  isSubmitting: boolean;
  setVenue: Dispatch<SetStateAction<CreateVenueRequest>>;
  setVenueSeats: Dispatch<SetStateAction<CreateVenueSeatRequest[]>>;
  setErrors: Dispatch<SetStateAction<VenueFormErrors>>;
  setSelectedSeatIndices: Dispatch<SetStateAction<number[]>>;
  onLayoutChangeStart: () => void;
}

const VenueLayoutEditor = ({
  venue,
  venueSeats,
  selectedSeatIndices,
  isSubmitting,
  setVenue,
  setVenueSeats,
  setErrors,
  setSelectedSeatIndices,
  onLayoutChangeStart,
}: VenueLayoutEditorProps) => {
  const { selectedSet, selectedBounds } = useVenueLayoutSelection({
    venueSeats,
    selectedSeatIndices,
  });

  const {
    svgRef,
    dragState,
    zoom,
    pan,
    isAltPressed,
    maxZoom,
    applyZoom,
    resetView,
    handleKeyDown,
    handlePointerMove,
    startStageDrag,
    startSeatDrag,
    startSelectedAreaDrag,
    startBackgroundDrag,
    finishDrag,
  } = useVenueLayoutInteraction({
    venue,
    venueSeats,
    selectedSeatIndices,
    isSubmitting,
    setSelectedSeatIndices,
    setVenue,
    setVenueSeats,
    setErrors,
    onLayoutChangeStart,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">좌석 배치도</p>
          <p className="mt-0.5 text-xs text-slate-400">드래그로 화면 이동 · Alt/Option + 드래그로 영역 선택</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
          <button
            aria-label="축소"
            className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-40"
            disabled={isSubmitting || zoom <= VENUE_LAYOUT_MIN_ZOOM}
            onClick={() => applyZoom(zoom / VENUE_LAYOUT_ZOOM_FACTOR)}
            type="button"
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-11 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
          <button
            aria-label="확대"
            className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-40"
            disabled={isSubmitting || zoom >= maxZoom}
            onClick={() => applyZoom(zoom * VENUE_LAYOUT_ZOOM_FACTOR)}
            type="button"
          >
            <Plus className="size-4" />
          </button>
          <button
            aria-label="화면 초기화"
            className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-40"
            disabled={isSubmitting || zoom === 1}
            onClick={resetView}
            type="button"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <svg
          ref={svgRef}
          aria-label="공연장 좌석 배치 편집기"
          className={`aspect-16/10 w-full rounded-xl bg-slate-900 outline-none select-none focus:outline-none ${getLayoutClassName(isSubmitting, dragState, isAltPressed)}`}
          onPointerMove={handlePointerMove}
          onKeyDown={handleKeyDown}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          tabIndex={0}
          viewBox={`${pan.x} ${pan.y} ${Math.max(venue.width, 1) / zoom} ${Math.max(venue.height, 1) / zoom}`}
        >
          <defs>
            <pattern id="venue-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#334155" strokeWidth={0.35 / zoom} />
            </pattern>
          </defs>
          <rect
            width={Math.max(venue.width, 1)}
            height={Math.max(venue.height, 1)}
            fill="url(#venue-grid)"
            stroke="#475569"
            strokeWidth={0.6 / zoom}
            onPointerDown={startBackgroundDrag}
          />
          {selectedBounds && (
            <rect
              x={selectedBounds.left}
              y={selectedBounds.top}
              width={selectedBounds.right - selectedBounds.left}
              height={selectedBounds.bottom - selectedBounds.top}
              fill="#ffffff01"
              stroke="#fef3c766"
              strokeDasharray={`${1.5 / zoom} ${1.5 / zoom}`}
              strokeWidth={0.45 / zoom}
              onPointerDown={startSelectedAreaDrag}
            />
          )}
          <g className={isSubmitting ? "" : "cursor-grab active:cursor-grabbing"} onPointerDown={startStageDrag}>
            <rect
              x={venue.stagePositionX - venue.stageWidth / 2}
              y={venue.stagePositionY - venue.stageHeight / 2}
              width={venue.stageWidth}
              height={venue.stageHeight}
              rx={Math.min(venue.stageHeight / 4, 2)}
              fill="#7c3aed"
              stroke="#c4b5fd"
              strokeWidth={0.7 / zoom}
            />
            <text
              x={venue.stagePositionX}
              y={venue.stagePositionY}
              dominantBaseline="middle"
              fill="white"
              fontSize={Math.max(Math.min(venue.stageHeight * 0.45, Math.max(venue.width, 1) / 30), 2.5)}
              fontWeight="700"
              pointerEvents="none"
              textAnchor="middle"
            >
              STAGE
            </text>
          </g>
          {venueSeats.map((seat, index) => {
            const selected = selectedSet.has(index);
            return (
              <g
                className={isSubmitting ? "" : "cursor-grab active:cursor-grabbing"}
                key={`${seat.sectionName}-${seat.seatNumber}-${index}`}
                onPointerDown={(event) => startSeatDrag(event, index)}
              >
                <rect
                  x={seat.positionX - VENUE_SEAT_WIDTH / 2}
                  y={seat.positionY - VENUE_SEAT_HEIGHT / 2}
                  width={VENUE_SEAT_WIDTH}
                  height={VENUE_SEAT_HEIGHT}
                  rx={VENUE_SEAT_WIDTH * 0.22}
                  fill={getSectionColor(seat.sectionName)}
                  stroke={selected ? "#fef3c7" : "#e2e8f0"}
                  strokeWidth={(selected ? 0.6 : 0.3) / zoom}
                />
                <title>
                  {seat.seatLabel || `좌석 ${index + 1}`} ({seat.positionX}, {seat.positionY})
                </title>
              </g>
            );
          })}
          {dragState?.type === "select" && (
            <rect
              x={Math.min(dragState.startX, dragState.currentX)}
              y={Math.min(dragState.startY, dragState.currentY)}
              width={Math.abs(dragState.currentX - dragState.startX)}
              height={Math.abs(dragState.currentY - dragState.startY)}
              fill="#8b5cf633"
              pointerEvents="none"
              stroke="#a78bfa"
              strokeDasharray={`${2 / zoom} ${1.5 / zoom}`}
              strokeWidth={0.7 / zoom}
            />
          )}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-4 px-4 pb-4 text-xs text-slate-400">
        {Array.from(new Set(venueSeats.map((seat) => seat.sectionName || "미지정")))
          .slice(0, 5)
          .map((sectionName) => (
            <span className="flex items-center gap-1.5" key={sectionName}>
              <i className="h-2.5 w-3 rounded-xs" style={{ backgroundColor: getSectionColor(sectionName) }} /> {sectionName}
            </span>
          ))}
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-3 rounded-xs border-2 border-amber-100" /> 선택 좌석
        </span>
        {selectedSeatIndices.length > 1 && <span className="font-semibold text-amber-400">{selectedSeatIndices.length}개 함께 이동</span>}
        <span className="ml-auto flex items-center gap-1">
          <Move className="size-3.5" /> {venueSeats.length.toLocaleString()}석 · 드래그 이동 · Alt/Option + 휠 확대
        </span>
      </div>
    </div>
  );
};

export default VenueLayoutEditor;
