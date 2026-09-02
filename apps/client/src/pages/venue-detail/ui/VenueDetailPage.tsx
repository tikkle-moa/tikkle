import { MapPinned } from "lucide-react";

import DetailMessage from "@shared/ui/DetailMessage";

import { VenueMap } from "@features/venue-map";

import VenueDetailSkeleton from "./VenueDetailSkeleton";

import { useVenueDetail } from "../model/use-venue-detail";
import { VENUE_DETAIL_MESSAGES } from "../model/venue-detail.constants";

const VenueDetailPage = () => {
  const { isParamValid, venue, venueSeats, isPending, isError } = useVenueDetail();

  if (!isParamValid) {
    return <DetailMessage {...VENUE_DETAIL_MESSAGES.invalid} />;
  }

  if (isPending) {
    return <VenueDetailSkeleton />;
  }

  if (isError || !venue) {
    return <DetailMessage {...VENUE_DETAIL_MESSAGES.error} />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section
        aria-labelledby="venue-detail-title"
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-950 via-violet-950 to-fuchsia-950 px-5 py-6 text-white shadow-xl shadow-violet-950/10 sm:px-8 sm:py-8"
      >
        <div aria-hidden className="absolute -top-24 -right-16 size-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-28 -left-16 size-64 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative">
          <span className="flex items-center gap-1.5 text-xs font-medium text-violet-200">
            <MapPinned className="size-3.5" aria-hidden />
            공연장 안내
          </span>

          <h1 id="venue-detail-title" className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            {venue.name}
          </h1>

          <p className="mt-3 flex items-start gap-1.5 text-sm text-violet-100">
            <MapPinned className="mt-0.5 size-4 shrink-0" aria-hidden />
            {venue.address}
          </p>

          {venue.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-violet-100">{venue.description}</p>}
        </div>
      </section>

      <VenueMap venue={venue} venueSeats={venueSeats} />
    </div>
  );
};

export default VenueDetailPage;
