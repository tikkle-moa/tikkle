import { type Dispatch, type SetStateAction, memo } from "react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import PerformanceSeatHoldActions from "./PerformanceSeatHoldActions";
import PerformanceSeatHoldHeader from "./PerformanceSeatHoldHeader";
import PerformanceSeatHoldInfo from "./PerformanceSeatHoldInfo";
import PerformanceSeatMyGroupHolds from "./PerformanceSeatMyGroupHolds";

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
  setServerTimeOffset: Dispatch<SetStateAction<number>>;
  setSeatOperationState: Dispatch<SetStateAction<SeatOperationState>>;
}

const PerformanceSeatHoldPanel = ({
  performanceId,
  venueSeats,
  venueSeatStates,
  selectedSeatIds,
  seatOperationState,
  setVenueSeatStates,
  setSelectedSeatIds,
  setServerTimeOffset,
  setSeatOperationState,
}: PerformanceSeatHoldPanelProps) => {
  const {
    isRefreshing,
    myGroupHoldInfoByHoldId,
    myGroupHeldSeatInfoBySeatId,
    selectedSeatIdsToRelease,
    myGroupHeldSeatTotalPrice,
    venueSeatById,
    handleRefresh,
    handleReleaseSeats,
    visibleSeatOperationState,
    isConnected,
    connectionStyle,
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
        handleRefresh={handleRefresh}
      />

      <div className="space-y-3 px-3 py-4 sm:px-5">
        <PerformanceSeatHoldActions
          myGroupHeldSeatSize={myGroupHeldSeatInfoBySeatId.size}
          myGroupHeldSeatTotalPrice={myGroupHeldSeatTotalPrice}
          selectedSeatIdsToReleaseSize={selectedSeatIdsToRelease.length}
          isConnected={isConnected}
          visibleSeatOperationState={visibleSeatOperationState}
          handleReleaseSeats={handleReleaseSeats}
        />

        <PerformanceSeatMyGroupHolds venueSeatById={venueSeatById} myGroupHoldInfoByHoldId={myGroupHoldInfoByHoldId} />

        <PerformanceSeatHoldInfo />
      </div>
    </aside>
  );
};

export default memo(PerformanceSeatHoldPanel);
