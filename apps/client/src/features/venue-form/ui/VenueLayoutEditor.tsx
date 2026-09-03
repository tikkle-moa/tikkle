import { type Dispatch, type SetStateAction } from "react";

import { Maximize2, Minus, Move, Plus } from "lucide-react";

import { type CreateVenueRequest, getVenueStageCornerRadius, getVenueStageTitleFontSize } from "@entities/venue";

import VenueSeatLayout from "./VenueSeatLayout";

import { useVenueLayoutInteraction } from "../model/use-venue-layout-interaction";
import { useVenueLayoutSelection } from "../model/use-venue-layout-selection";
import type { VenueFormErrors, VenueFormSeat } from "../model/venue-form.types";
import { VENUE_LAYOUT_MIN_ZOOM, VENUE_LAYOUT_ZOOM_FACTOR } from "../model/venue-layout.constants";
import { getLayoutClassName, getSectionColor } from "../model/venue-layout.utils";

interface VenueLayoutEditorProps {
  venue: CreateVenueRequest;
  venueSeats: VenueFormSeat[];
  selectedSeatClientIds: number[];
  errorSeatClientIds: Set<number>;
  isSubmitting: boolean;
  setVenue: Dispatch<SetStateAction<CreateVenueRequest>>;
  setVenueSeats: Dispatch<SetStateAction<VenueFormSeat[]>>;
  setErrors: Dispatch<SetStateAction<VenueFormErrors>>;
  setSelectedSeatClientIds: Dispatch<SetStateAction<number[]>>;
  onLayoutChangeStart: () => void;
}

const VenueLayoutEditor = ({
  venue,
  venueSeats,
  selectedSeatClientIds,
  errorSeatClientIds,
  isSubmitting,
  setVenue,
  setVenueSeats,
  setErrors,
  setSelectedSeatClientIds,
  onLayoutChangeStart,
}: VenueLayoutEditorProps) => {
  const { sectionNames, selectedSeatClientIdSet, selectedBounds } = useVenueLayoutSelection({ venueSeats, selectedSeatClientIds });

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
    selectedSeatClientIdSet,
    isSubmitting,
    setVenue,
    setVenueSeats,
    setErrors,
    setSelectedSeatClientIds,
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
          className={`aspect-square w-full rounded-xl bg-slate-900 outline-none select-none focus:outline-none lg:aspect-16/10 ${getLayoutClassName(isSubmitting, dragState, isAltPressed)}`}
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
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#334155" strokeWidth={0.35} />
            </pattern>
          </defs>
          <rect
            width={Math.max(venue.width, 1)}
            height={Math.max(venue.height, 1)}
            fill="url(#venue-grid)"
            stroke="#475569"
            strokeWidth={0.6}
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
              strokeDasharray="1.5 1.5"
              strokeWidth={0.45}
              onPointerDown={startSelectedAreaDrag}
            />
          )}
          <g className={isSubmitting ? "" : "cursor-grab active:cursor-grabbing"} onPointerDown={startStageDrag}>
            <rect
              x={venue.stagePositionX - venue.stageWidth / 2}
              y={venue.stagePositionY - venue.stageHeight / 2}
              width={venue.stageWidth}
              height={venue.stageHeight}
              rx={getVenueStageCornerRadius(venue.stageWidth, venue.stageHeight)}
              fill="#7c3aed"
              stroke="#c4b5fd"
              strokeWidth={0.7}
            />
            <text
              x={venue.stagePositionX}
              y={venue.stagePositionY}
              dominantBaseline="middle"
              fill="white"
              fontSize={getVenueStageTitleFontSize(venue.stageWidth, venue.stageHeight)}
              fontWeight="700"
              pointerEvents="none"
              textAnchor="middle"
            >
              STAGE
            </text>
          </g>
          <VenueSeatLayout
            venueSeats={venueSeats}
            selectedSeatClientIdSet={selectedSeatClientIdSet}
            errorSeatClientIds={errorSeatClientIds}
            isSubmitting={isSubmitting}
            startSeatDrag={startSeatDrag}
          />
          {dragState?.type === "select" && (
            <rect
              x={Math.min(dragState.startX, dragState.currentX)}
              y={Math.min(dragState.startY, dragState.currentY)}
              width={Math.abs(dragState.currentX - dragState.startX)}
              height={Math.abs(dragState.currentY - dragState.startY)}
              fill="#8b5cf633"
              pointerEvents="none"
              stroke="#a78bfa"
              strokeDasharray="2 1.5"
              strokeWidth={0.7}
            />
          )}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-4 px-4 pb-4 text-xs text-slate-400">
        {sectionNames.map((sectionName) => (
          <span className="flex items-center gap-1.5" key={sectionName}>
            <i className="h-2.5 w-3 rounded-xs" style={{ backgroundColor: getSectionColor(sectionName) }} /> {sectionName}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-3 rounded-xs border-2 border-amber-100" /> 선택 좌석
        </span>
        {selectedSeatClientIdSet.size > 1 && <span className="font-semibold text-amber-400">{selectedSeatClientIdSet.size}개 함께 이동</span>}
        <span className="ml-auto flex items-center gap-1">
          <Move className="size-3.5" /> {venueSeats.length.toLocaleString()}석 · 드래그 이동 · Alt/Option + 휠 확대
        </span>
      </div>
    </div>
  );
};

export default VenueLayoutEditor;
