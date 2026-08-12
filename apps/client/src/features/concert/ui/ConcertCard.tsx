import { MapPin, Music } from "lucide-react";

import type { ConcertResponse } from "@entities/concert";

import { useConcertCard } from "../model/use-concert-card";
import { useConcertCardTilt } from "../model/use-concert-card-tilt";

interface ConcertCardProps {
  concert: ConcertResponse;
  onClick?: () => void;
}

const ConcertCard = ({ concert, onClick }: ConcertCardProps) => {
  const { posterUrl, title, placeName, period, statusLabel, statusClassName } = useConcertCard({ concert });

  const { cardRef, tilt, glare, isHovered, outerShadow, handleMouseMove, handleMouseEnter, handleMouseLeave } = useConcertCardTilt();

  return (
    <div className="flex flex-col">
      <div
        ref={cardRef}
        className="cursor-pointer perspective-midrange"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        <div
          className="relative overflow-hidden rounded-xl bg-white transition-[transform,box-shadow] ease-out will-change-transform transform-3d"
          style={{
            transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${isHovered ? 1.04 : 1})`,
            transitionDuration: isHovered ? "80ms" : "400ms",
            boxShadow: outerShadow,
          }}
        >
          <div className="relative aspect-3/4 overflow-hidden bg-gray-100">
            {posterUrl ? (
              <img src={posterUrl} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-linear-to-br from-indigo-950 via-purple-950 to-fuchsia-950 px-4 text-center">
                <Music size={36} className="text-violet-300/60" />

                <p className="line-clamp-3 text-xs leading-snug font-bold text-white">{title}</p>

                <p className="flex items-center gap-1 text-[10px] text-white/50">
                  <MapPin size={9} />
                  {placeName}
                </p>
              </div>
            )}

            <span className={`absolute top-2.5 left-2.5 translate-z-5 rounded-md px-2 py-0.5 text-xs font-bold shadow ${statusClassName}`}>
              {statusLabel}
            </span>

            {isHovered && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle at ${glare.x}% ${glare.y}%,rgba(255, 255, 255, 0.18),transparent 70%)`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-1 py-2">
        <h3 className="cursor-pointer truncate text-sm font-bold text-gray-900 transition-colors hover:text-violet-700" onClick={onClick}>
          {title}
        </h3>

        <p className="flex items-center gap-1 truncate text-xs text-gray-500">
          <MapPin size={12} className="shrink-0" />
          {placeName}
        </p>

        <p className="truncate text-xs text-gray-400">{period}</p>
      </div>
    </div>
  );
};

export default ConcertCard;
