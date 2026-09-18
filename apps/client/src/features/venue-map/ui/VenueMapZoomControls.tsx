import { memo } from "react";

import { Minus, Plus } from "lucide-react";

interface VenueMapZoomControlsProps {
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
}

const VenueMapZoomControls = ({ zoom, canZoomIn, canZoomOut, zoomIn, zoomOut }: VenueMapZoomControlsProps) => (
  <div
    role="group"
    aria-label="좌석 배치도 확대 제어"
    className="absolute top-3 right-3 flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-md backdrop-blur"
  >
    <button
      type="button"
      aria-label="축소"
      className="p-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
      disabled={!canZoomOut}
      onClick={zoomOut}
    >
      <Minus className="size-3.5" aria-hidden />
    </button>

    <output aria-label="현재 확대 비율" className="min-w-12 border-x border-slate-200 px-1 text-center text-[11px] font-extrabold">
      {Math.round(zoom * 100)}%
    </output>

    <button
      type="button"
      aria-label="확대"
      className="p-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
      disabled={!canZoomIn}
      onClick={zoomIn}
    >
      <Plus className="size-3.5" aria-hidden />
    </button>
  </div>
);

export default memo(VenueMapZoomControls);
