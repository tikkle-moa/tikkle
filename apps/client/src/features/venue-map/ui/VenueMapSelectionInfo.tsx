import { memo } from "react";

import { Info } from "lucide-react";

import { type VenueSeatResponse, type VenueSeatStatus, isHeldSeatStatus } from "@entities/venue";

import VenueMapSelectedSeatStatus from "./VenueMapSelectedSeatStatus";

import { getSeatStatusMessage } from "../model/venue-map.utils";

interface VenueMapSelectionInfoProps {
  selectedSeat: VenueSeatResponse | null;
  selectedSeatIds?: ReadonlySet<number>;
  selectedSeatStatus: VenueSeatStatus | null;
  expiresAt?: Date;
  serverTimeOffset: number;
}

const VenueMapSelectionInfo = ({ selectedSeat, selectedSeatIds, selectedSeatStatus, expiresAt, serverTimeOffset }: VenueMapSelectionInfoProps) => {
  const staticStatusMessage = selectedSeatStatus && !isHeldSeatStatus(selectedSeatStatus) ? getSeatStatusMessage(selectedSeatStatus) : null;

  return (
    <div
      className="mt-4 flex min-h-10 items-center gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 text-xs text-slate-500 shadow-sm"
      aria-live="polite"
    >
      <Info className="size-3.5 shrink-0" aria-hidden />
      {selectedSeat && (!selectedSeatIds || selectedSeatIds.has(selectedSeat.id)) ? (
        <div className="min-w-0">
          <p>
            <span className="font-bold text-slate-700">{selectedSeat.seatLabel}</span> · {selectedSeat.sectionName} ·{" "}
            {selectedSeat.price.toLocaleString()}원
          </p>
          {selectedSeatStatus &&
            (isHeldSeatStatus(selectedSeatStatus) ? (
              <VenueMapSelectedSeatStatus status={selectedSeatStatus} expiresAt={expiresAt} serverTimeOffset={serverTimeOffset} />
            ) : (
              <p className="mt-1 font-semibold text-slate-600">{staticStatusMessage?.description}</p>
            ))}
        </div>
      ) : (
        <div>
          <p>좌석을 탭하거나 클릭하여 선택하세요.</p>
          <p>Alt/Option + 스크롤 또는 두 손가락으로 확대하고, 확대된 상태에서 드래그하여 이동할 수 있어요.</p>
          {selectedSeatIds && (
            <p className="hidden pointer-fine:block">
              Alt/Option + 드래그로 여러 좌석을 한 번에 선택할 수 있어요. Shift 키를 함께 누르면 기존 선택을 유지하면서 선택할 수 있어요.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(VenueMapSelectionInfo);
