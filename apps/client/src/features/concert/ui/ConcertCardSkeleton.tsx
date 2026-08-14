import { ASPECT_RATIO_CLASS } from "../model/concert-card.constants";
import type { AspectRatio, DisplayOptions } from "../model/concert-card.types";

interface ConcertCardSkeletonProps {
  className?: string;
  ratio?: AspectRatio;
  displayOptions?: DisplayOptions;
}

const ConcertCardSkeleton = ({
  className,
  ratio = "3/4",
  displayOptions: { showTitle = false, showPlaceName = false, showPeriod = false } = {},
}: ConcertCardSkeletonProps) => {
  return (
    <div className={`flex cursor-default flex-col ${className ?? ""}`}>
      <div className="overflow-hidden rounded-xl bg-white">
        <div className={`relative ${ASPECT_RATIO_CLASS[ratio]} overflow-hidden bg-gray-100`}>
          <div className="h-full w-full animate-pulse bg-gray-200" />
        </div>
      </div>

      {(showTitle || showPlaceName || showPeriod) && (
        <div className="flex flex-col gap-1.5 px-1 py-2">
          {showTitle && <div className="h-3.5 w-4/5 animate-pulse rounded bg-gray-200" />}

          {showPlaceName && <div className="h-3 w-3/5 animate-pulse rounded bg-gray-200" />}

          {showPeriod && <div className="h-3 w-2/5 animate-pulse rounded bg-gray-200" />}
        </div>
      )}
    </div>
  );
};

export default ConcertCardSkeleton;
