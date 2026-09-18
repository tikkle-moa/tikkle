import { useCurrentTime } from "@shared/model/use-current-time";

import type { VenueSeatStatus } from "@entities/venue";

import { getSeatStatusMessage } from "../model/venue-map.utils";

interface VenueMapSelectedSeatStatusProps {
  status: VenueSeatStatus;
  expiresAt?: Date;
  serverTimeOffset: number;
}

const VenueMapSelectedSeatStatus = ({ status, expiresAt, serverTimeOffset }: VenueMapSelectedSeatStatusProps) => {
  const currentTime = useCurrentTime();
  const statusMessage = getSeatStatusMessage(status, expiresAt, currentTime, serverTimeOffset);

  return <p className="mt-1 font-semibold text-slate-600">{statusMessage.description}</p>;
};

export default VenueMapSelectedSeatStatus;
