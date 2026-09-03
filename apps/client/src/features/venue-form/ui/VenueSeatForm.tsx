import type { Dispatch, RefObject, SetStateAction } from "react";

import { Armchair, CircleAlert, Plus, Trash2, Undo2 } from "lucide-react";

import { toRound } from "@shared/lib/number.utils";

import type { CreateVenueRequest } from "@entities/venue";

import SeatBatchCreator from "./SeatBatchCreator";
import VenueFormNumberInput from "./VenueFormNumberInput";
import VenueFormTextInput from "./VenueFormTextInput";
import VenueLayoutEditor from "./VenueLayoutEditor";

import { useVenueSeatForm } from "../model/use-venue-seat-form";
import type { VenueFormErrors, VenueFormSeat } from "../model/venue-form.types";
import { getVenueSeatClassName } from "../model/venue-form.utils";

interface VenueSeatFormProps {
  venue: CreateVenueRequest;
  venueSeats: VenueFormSeat[];
  errors: VenueFormErrors;
  venueSeatClientIdRef: RefObject<number>;
  isSubmitting: boolean;
  setVenue: Dispatch<SetStateAction<CreateVenueRequest>>;
  setVenueSeats: Dispatch<SetStateAction<VenueFormSeat[]>>;
  setErrors: Dispatch<SetStateAction<VenueFormErrors>>;
}

const VenueSeatForm = ({ venue, venueSeats, errors, venueSeatClientIdRef, isSubmitting, setVenue, setVenueSeats, setErrors }: VenueSeatFormProps) => {
  const {
    selectedSeatClientIds,
    errorSeatClientIds,
    collisionMapRef,
    canUndo,
    setSelectedSeatClientIds,
    saveLayoutSnapshot,
    handleUndo,
    handleAddSeat,
    handleAddSeats,
    handleRemoveSelectedSeats,
    updateVenueSeat,
  } = useVenueSeatForm({ venue, venueSeats, errors, venueSeatClientIdRef, setVenueSeats, setErrors });
  const currentSeat = selectedSeatClientIds.length === 1 ? venueSeats.find((seat) => seat.clientId === selectedSeatClientIds[0]) : null;

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Armchair className="size-4" aria-hidden /> 좌석 정보 <span className="text-red-500">*</span>
          </h3>
          <p className="mt-1 text-xs text-slate-500">배치도에서 좌석을 선택하거나 드래그해 위치를 편집하세요.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            aria-label="마지막 배치 변경 실행 취소"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            disabled={isSubmitting || !canUndo}
            onClick={handleUndo}
            title="실행 취소 (Cmd/Ctrl + Z)"
            type="button"
          >
            <Undo2 className="size-4" aria-hidden />
          </button>
          <button
            className="text-brand-primary hover:bg-brand-primary/5 flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleAddSeat}
            type="button"
          >
            <Plus className="size-4" aria-hidden /> 좌석 추가
          </button>
        </div>
      </div>
      {errors.venueSeats && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.venueSeats}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <VenueLayoutEditor
          venue={venue}
          venueSeats={venueSeats}
          selectedSeatClientIds={selectedSeatClientIds}
          errorSeatClientIds={errorSeatClientIds}
          collisionMapRef={collisionMapRef}
          isSubmitting={isSubmitting}
          setVenue={setVenue}
          setVenueSeats={setVenueSeats}
          setErrors={setErrors}
          setSelectedSeatClientIds={setSelectedSeatClientIds}
          onLayoutChangeStart={saveLayoutSnapshot}
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          {selectedSeatClientIds.length > 1 && (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <Armchair className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-900">좌석 {selectedSeatClientIds.length}개 선택됨</p>
              <p className="mt-1 max-w-64 text-xs leading-5 text-slate-500">선택 영역을 드래그하면 좌석을 함께 이동할 수 있습니다.</p>
              <button
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                disabled={isSubmitting}
                onClick={handleRemoveSelectedSeats}
                type="button"
              >
                <Trash2 className="size-4" aria-hidden /> 선택 좌석 모두 삭제
              </button>
            </div>
          )}
          {selectedSeatClientIds.length === 1 && currentSeat && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">선택 좌석 편집</p>
                  <p className="mt-0.5 text-xs text-slate-500">목록 번호 {selectedSeatClientIds[0] + 1}</p>
                </div>
                <button
                  aria-label="선택 좌석 삭제"
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  disabled={isSubmitting}
                  onClick={handleRemoveSelectedSeats}
                  type="button"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <VenueFormTextInput
                  id="selected-seat-section"
                  label="구역명"
                  value={currentSeat.sectionName}
                  error={errors[`seat.${selectedSeatClientIds[0]}.sectionName`]}
                  required
                  disabled={isSubmitting}
                  onChange={(value) => updateVenueSeat(selectedSeatClientIds[0], "sectionName", value)}
                />
                <VenueFormNumberInput
                  id="selected-seat-number"
                  label="좌석 번호"
                  value={currentSeat.seatNumber}
                  min={1}
                  max={null}
                  error={errors[`seat.${selectedSeatClientIds[0]}.seatNumber`]}
                  required
                  disabled={isSubmitting}
                  onChange={(value) => updateVenueSeat(selectedSeatClientIds[0], "seatNumber", toRound(value))}
                />
                <VenueFormTextInput
                  id="selected-seat-label"
                  label="좌석 표시"
                  value={currentSeat.seatLabel}
                  error={errors[`seat.${selectedSeatClientIds[0]}.seatLabel`]}
                  required
                  disabled={isSubmitting}
                  onChange={(value) => updateVenueSeat(selectedSeatClientIds[0], "seatLabel", value)}
                />
                <VenueFormNumberInput
                  id="selected-seat-price"
                  label="가격 (원)"
                  value={currentSeat.price}
                  max={null}
                  error={errors[`seat.${selectedSeatClientIds[0]}.price`]}
                  required
                  disabled={isSubmitting}
                  onChange={(value) => updateVenueSeat(selectedSeatClientIds[0], "price", toRound(value))}
                />
                <VenueFormNumberInput
                  id="selected-seat-x"
                  label="X 좌표"
                  value={currentSeat.positionX}
                  max={venue.width}
                  error={errors[`seat.${selectedSeatClientIds[0]}.positionX`]}
                  required
                  disabled={isSubmitting}
                  onChange={(value) => updateVenueSeat(selectedSeatClientIds[0], "positionX", toRound(value, 2))}
                />
                <VenueFormNumberInput
                  id="selected-seat-y"
                  label="Y 좌표"
                  value={currentSeat.positionY}
                  max={venue.height}
                  error={errors[`seat.${selectedSeatClientIds[0]}.positionY`]}
                  required
                  disabled={isSubmitting}
                  onChange={(value) => updateVenueSeat(selectedSeatClientIds[0], "positionY", toRound(value, 2))}
                />
              </div>
            </div>
          )}
          {selectedSeatClientIds.length === 0 && (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <Armchair className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-700">편집할 좌석을 선택하세요</p>
              <p className="mt-1 max-w-56 text-xs leading-5 text-slate-500">배치도의 좌석을 누르면 상세 정보와 좌표를 수정할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>

      {venueSeats.length > 0 && (
        <div className="flex max-h-32 scrollbar-thin flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {venueSeats.map((seat) => {
            const hasError = errorSeatClientIds.has(seat.clientId);
            const isSelected = selectedSeatClientIds.includes(seat.clientId);
            return (
              <button
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${getVenueSeatClassName(hasError, isSelected)}`}
                key={seat.clientId}
                onClick={(event) =>
                  setSelectedSeatClientIds((current) => {
                    if (!event.shiftKey) return [seat.clientId];
                    return current.includes(seat.clientId)
                      ? current.filter((selectedId) => selectedId !== seat.clientId)
                      : [...current, seat.clientId];
                  })
                }
                type="button"
              >
                {hasError && <CircleAlert className="size-3.5 shrink-0 text-red-500" aria-hidden />}{" "}
                {seat.seatLabel.trim() || `좌석 ${seat.clientId}`} ({seat.clientId})
              </button>
            );
          })}
        </div>
      )}

      <SeatBatchCreator
        venue={venue}
        venueSeats={venueSeats}
        venueSeatClientIdRef={venueSeatClientIdRef}
        isSubmitting={isSubmitting}
        onAddSeats={handleAddSeats}
      />
    </section>
  );
};

export default VenueSeatForm;
