import { type KeyboardEvent, type PointerEvent, useCallback, useMemo } from "react";

import { type VenueResponse, type VenueSeatResponse, type VenueSeatState, type VenueSeatStatus } from "@entities/venue";

import { useVenueMap } from "./use-venue-map";
import { useVenueMapDragSelection } from "./use-venue-map-drag-selection";

interface UseVenueMapCanvasParams {
  venue: VenueResponse;
  venueSeats: VenueSeatResponse[];
  venueSeatStates?: ReadonlyMap<number, VenueSeatState>;
  selectedSeatIds?: ReadonlySet<number>;
  onSeatToggle?: (seat: number) => void;
  onSeatSelectionChange?: (seatIds: ReadonlySet<number>) => void;
}

export const useVenueMapCanvas = ({
  venue,
  venueSeats,
  venueSeatStates,
  selectedSeatIds,
  onSeatToggle,
  onSeatSelectionChange,
}: UseVenueMapCanvasParams) => {
  const {
    mapRef,
    svgRef,
    selectedSeat,
    selectSeat,
    getSeatTabIndex,
    handleSeatKeyDown: handleSeatNavigation,
    viewBox,
    zoom,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    consumeSeatClick,
    handlePointerDown: handleMapPointerDown,
    handlePointerMove: handleMapPointerMove,
    handlePointerUp: handleMapPointerUp,
  } = useVenueMap({
    width: venue.width,
    height: venue.height,
    venueSeats,
    trackDragging: false,
    directDragRendering: true,
  });
  const {
    dragSelection,
    consumeSeatClick: consumeDragSelectionSeatClick,
    handlePointerDown: handleDragSelectionPointerDown,
    handlePointerMove: handleDragSelectionPointerMove,
    handlePointerUp: handleDragSelectionPointerUp,
    handlePointerCancel: handleDragSelectionPointerCancel,
  } = useVenueMapDragSelection({
    svgRef,
    venueSeats,
    venueSeatStates,
    selectedSeatIds,
    enabled: Boolean(onSeatSelectionChange),
    onSeatSelectionChange,
  });
  const selectedSeatStatus: VenueSeatStatus | null = useMemo(
    () => (selectedSeat && venueSeatStates ? (venueSeatStates.get(selectedSeat.id)?.status ?? "available") : null),
    [venueSeatStates, selectedSeat],
  );
  const stageX = venue.stagePositionX - venue.stageWidth / 2;
  const stageY = venue.stagePositionY - venue.stageHeight / 2;

  const handleSeatClick = useCallback(
    (seat: VenueSeatResponse, isSeatSelectable: boolean) => {
      if (consumeDragSelectionSeatClick() || consumeSeatClick()) return;

      selectSeat(seat);
      if (isSeatSelectable) {
        onSeatToggle?.(seat.id);
      }
    },
    [consumeDragSelectionSeatClick, consumeSeatClick, onSeatToggle, selectSeat],
  );

  const handleSeatKeyDown = useCallback(
    (event: KeyboardEvent<SVGElement>, seat: VenueSeatResponse, isSeatSelectable: boolean) => {
      if (onSeatToggle && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        selectSeat(seat);
        if (isSeatSelectable) {
          onSeatToggle(seat.id);
        }
        return;
      }

      handleSeatNavigation(event, seat);
    },
    [handleSeatNavigation, onSeatToggle, selectSeat],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!handleDragSelectionPointerDown(event)) handleMapPointerDown(event);
    },
    [handleDragSelectionPointerDown, handleMapPointerDown],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!handleDragSelectionPointerMove(event)) handleMapPointerMove(event);
    },
    [handleDragSelectionPointerMove, handleMapPointerMove],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!handleDragSelectionPointerUp(event)) handleMapPointerUp(event);
    },
    [handleDragSelectionPointerUp, handleMapPointerUp],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!handleDragSelectionPointerCancel(event)) handleMapPointerUp(event);
    },
    [handleDragSelectionPointerCancel, handleMapPointerUp],
  );

  return {
    mapRef,
    svgRef,
    selectedSeat,
    selectedSeatStatus,
    viewBox,
    zoom,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    dragSelection,
    getSeatTabIndex,
    handleSeatClick,
    handleSeatKeyDown,
    stageX,
    stageY,
  };
};
