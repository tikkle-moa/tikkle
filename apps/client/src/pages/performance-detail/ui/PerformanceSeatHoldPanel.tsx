import { type Dispatch, type SetStateAction, memo } from "react";

import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import PerformanceSeatHoldActions from "./PerformanceSeatHoldActions";
import PerformanceSeatHoldHeader from "./PerformanceSeatHoldHeader";
import PerformanceSeatHoldInfo from "./PerformanceSeatHoldInfo";
import PerformanceSeatMyHolds from "./PerformanceSeatMyHolds";

import type { SeatOperationState } from "../model/seat-map.types";
import { usePerformanceSeatHoldPanel } from "../model/use-performance-seat-hold-panel";

interface PerformanceSeatHoldPanelProps {
  performanceId: number;
  venueSeats: VenueSeatResponse[];
  venueSeatStates: Map<number, VenueSeatState>;
  selectedSeatIds: Set<number>;
  seatOperationState: SeatOperationState;
  setVenueSeatStates: Dispatch<SetStateAction<Map<number, VenueSeatState>>>;
  setSelectedSeatIds: Dispatch<SetStateAction<Set<number>>>;
  onHoldSeatToggle: (seatIds: readonly number[]) => void;
  setServerTimeOffset: Dispatch<SetStateAction<number>>;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
  onCheckout?: (review: BeginCheckoutReviewMessageData) => void;
}

const PerformanceSeatHoldPanel = ({
  performanceId,
  venueSeats,
  venueSeatStates,
  selectedSeatIds,
  seatOperationState,
  setVenueSeatStates,
  setSelectedSeatIds,
  onHoldSeatToggle,
  setServerTimeOffset,
  setSeatOperationState,
  onCheckout,
}: PerformanceSeatHoldPanelProps) => {
  const {
    isRefreshing,
    refreshError,
    myHolds,
    myHeldSeatInfoBySeatId,
    selectedSeatIdsToRelease,
    myHeldSeatTotalPrice,
    venueSeatById,
    handleRefresh,
    handleReleaseSeats,
    visibleSeatOperationState,
    isConnected,
    connectionStyle,
    isCheckoutReviewBeginning,
    checkoutReviewErrorMessage,
    handleCheckout,
  } = usePerformanceSeatHoldPanel({
    performanceId,
    venueSeats,
    venueSeatStates,
    selectedSeatIds,
    seatOperationState,
    setVenueSeatStates,
    setSelectedSeatIds,
    setServerTimeOffset,
    setSeatOperationState,
    onCheckout,
  });

  return (
    <aside
      aria-label="좌석 선택 및 Hold"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 lg:sticky lg:top-6"
    >
      <PerformanceSeatHoldHeader
        connectionStyle={connectionStyle}
        isConnected={isConnected}
        isRefreshing={isRefreshing}
        refreshError={refreshError}
        handleRefresh={handleRefresh}
      />

      <div className="space-y-3 px-3 py-4 sm:px-5">
        <PerformanceSeatHoldActions
          myHeldSeatSize={myHeldSeatInfoBySeatId.size}
          myHeldSeatTotalPrice={myHeldSeatTotalPrice}
          selectedSeatIdsToReleaseSize={selectedSeatIdsToRelease.length}
          isConnected={isConnected}
          isCheckoutReviewBeginning={isCheckoutReviewBeginning}
          visibleSeatOperationState={visibleSeatOperationState}
          handleCheckout={handleCheckout}
          handleReleaseSeats={handleReleaseSeats}
        />
        {checkoutReviewErrorMessage && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {checkoutReviewErrorMessage}
          </p>
        )}

        {myHeldSeatInfoBySeatId.size > 0 && (
          <PerformanceSeatMyHolds
            venueSeatById={venueSeatById}
            myHolds={myHolds}
            myHeldSeatSize={myHeldSeatInfoBySeatId.size}
            selectedSeatIds={selectedSeatIds}
            onSelect={onHoldSeatToggle}
          />
        )}

        <PerformanceSeatHoldInfo />
      </div>
    </aside>
  );
};

export default memo(PerformanceSeatHoldPanel);
