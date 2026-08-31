import { type KeyboardEvent, useState } from "react";

import type { VenueSeatResponse } from "@entities/venue";

export const useVenueMap = () => {
  const [selectedSeat, setSelectedSeat] = useState<VenueSeatResponse | null>(null);

  const handleSeatKeyDown = (event: KeyboardEvent<SVGRectElement>, seat: VenueSeatResponse) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedSeat(seat);
    }
  };

  return {
    selectedSeat,
    selectSeat: setSelectedSeat,
    handleSeatKeyDown,
  };
};
