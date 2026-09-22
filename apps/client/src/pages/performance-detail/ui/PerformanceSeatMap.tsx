import { memo } from "react";

import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueDetailResponse } from "@entities/venue";

import { VenueMap } from "@features/venue-map";

import PerformanceSeatHoldPanel from "./PerformanceSeatHoldPanel";

import { usePerformanceSeatMap } from "../model/use-performance-seat-map";

interface PerformanceSeatMapProps {
  performance: PerformanceResponse;
  venueDetail: VenueDetailResponse;
  seatSelectionSessionId?: string | null;
  onCheckout?: (review: BeginCheckoutReviewMessageData) => void;
}

const PerformanceSeatMap = ({ performance, venueDetail, seatSelectionSessionId, onCheckout }: PerformanceSeatMapProps) => {
  const {
    sessionId,
    selectedSeatIds,
    setSelectedSeatIds,
    seatOperationState,
    setSeatOperationState,
    serverTimeOffset,
    setServerTimeOffset,
    venueSeatStates,
    setVenueSeatStates,
    toggleSeat,
    toggleHeldSeats,
    selectSeats,
  } = usePerformanceSeatMap({ performanceId: performance.id, sessionId: seatSelectionSessionId });

  const isAvailable = performance.status === "AVAILABLE";

  return (
    <div className={`mt-6 grid items-start gap-6 ${isAvailable ? "lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-7" : "grid-cols-1"}`}>
      <VenueMap
        venue={venueDetail.venue}
        venueSeats={venueDetail.venueSeats}
        className="mt-0 w-full"
        onSeatToggle={isAvailable ? toggleSeat : undefined}
        onSeatSelectionChange={isAvailable ? selectSeats : undefined}
        venueSeatStates={isAvailable ? venueSeatStates : undefined}
        serverTimeOffset={isAvailable ? serverTimeOffset : undefined}
        selectedSeatIds={isAvailable ? selectedSeatIds : undefined}
      />

      {isAvailable && (
        <PerformanceSeatHoldPanel
          performanceId={performance.id}
          sessionId={sessionId}
          venueSeats={venueDetail.venueSeats}
          venueSeatStates={venueSeatStates}
          selectedSeatIds={selectedSeatIds}
          seatOperationState={seatOperationState}
          setVenueSeatStates={setVenueSeatStates}
          setSelectedSeatIds={setSelectedSeatIds}
          onHoldSeatToggle={toggleHeldSeats}
          setServerTimeOffset={setServerTimeOffset}
          setSeatOperationState={setSeatOperationState}
          onCheckout={onCheckout}
        />
      )}
    </div>
  );
};

export default memo(PerformanceSeatMap);
