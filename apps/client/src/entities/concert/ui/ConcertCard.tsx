import { MapPin, Music } from "lucide-react";

import { ASPECT_RATIO_CLASS, DEFAULT_MAX_TILT, DEFAULT_SHADOW_OFFSET } from "../model/concert-card.constants";
import type { DisplayOptions, EffectOptions } from "../model/concert-card.types";
import { BOOKING_STATUS_MAP } from "../model/concert.constants";
import type { BookingStatus, ConcertListResponse } from "../model/concert.types";
import { useConcertCard } from "../model/use-concert-card";
import { useConcertCardTilt } from "../model/use-concert-card-tilt";

interface ConcertCardProps {
  concert: ConcertListResponse;
  status?: BookingStatus;
  className?: string;
  displayOptions?: DisplayOptions;
  effectOptions?: EffectOptions;
  onPosterError?: () => void;
}

const ConcertCard = ({
  concert,
  status,
  className,
  displayOptions: { showGenre = false, showTitle = false, showPlaceName = false } = {},
  effectOptions: {
    disableTilt = false,
    disableScale = false,
    disableGlare = false,
    disableShadow = false,
    maxTilt = DEFAULT_MAX_TILT,
    shadowOffset = DEFAULT_SHADOW_OFFSET,
    ratio = "3/4",
  } = {},
  onPosterError,
}: ConcertCardProps) => {
  const { posterUrl, title, placeName, GenreIcon, genreLabel, genreClassName } = useConcertCard({ concert });

  const { cardRef, tilt, glare, isHovered, outerShadow, handlePointerMove, handlePointerEnter, handlePointerLeave } = useConcertCardTilt({
    maxTilt,
    shadowOffset,
  });

  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      <div
        ref={cardRef}
        data-testid="concert-card"
        className="perspective-midrange"
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <div
          data-testid="concert-card-transform"
          className="relative overflow-hidden rounded-xl bg-white transition-[transform,box-shadow] ease-out will-change-transform transform-3d"
          style={{
            transform: `${!disableTilt ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) ` : ""}scale(${isHovered && !disableScale ? 1.02 : 1})`,
            transitionDuration: isHovered ? "80ms" : "400ms",
            boxShadow: !disableShadow ? outerShadow : "none",
          }}
        >
          <div className={`relative ${ASPECT_RATIO_CLASS[ratio]} overflow-hidden bg-gray-100`}>
            {posterUrl ? (
              <img src={posterUrl} alt={title} className="h-full w-full object-cover" onError={onPosterError} />
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

            {(status || showGenre) && (
              <div className="absolute top-2.5 left-2.5 flex translate-z-5 items-center gap-1.5">
                {status &&
                  (() => {
                    const { label: statusLabel, className: statusClassName } = BOOKING_STATUS_MAP[status];
                    return <span className={`flex h-6 items-center rounded-md px-2 text-xs font-bold shadow ${statusClassName}`}>{statusLabel}</span>;
                  })()}

                {showGenre && (
                  <span className={`flex h-6 items-center gap-1 rounded-md px-2 text-xs font-bold backdrop-blur-sm ${genreClassName}`}>
                    <GenreIcon className="size-4" />
                    {genreLabel}
                  </span>
                )}
              </div>
            )}

            {isHovered && !disableGlare && (
              <div
                data-testid="concert-card-glare"
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle at ${glare.x}% ${glare.y}%,rgba(255, 255, 255, 0.18),transparent 70%)`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {(showTitle || showPlaceName) && (
        <div className="flex flex-col gap-1 px-1 py-2 text-left">
          {showTitle && <p className="truncate text-sm font-bold text-gray-900 transition-colors hover:text-violet-700">{title}</p>}

          {showPlaceName && (
            <p className="flex items-center gap-1 truncate text-xs text-gray-500">
              <MapPin size={12} className="shrink-0" />
              {placeName}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConcertCard;
