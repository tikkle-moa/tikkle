import { Link, generatePath } from "react-router";

import { Armchair, Building2, CalendarDays, Ruler } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import VenueLocationLink from "./VenueLocationLink";

import type { VenueListResponse } from "../model/venue.types";

interface VenueCardProps {
  venue: VenueListResponse;
}

const VenueCard = ({ venue }: VenueCardProps) => {
  return (
    <div className="group relative flex h-full flex-col gap-3 rounded-2xl border border-violet-100 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/70">
      <Link
        aria-label={`${venue.name} 상세 보기`}
        className="absolute inset-0 rounded-2xl"
        to={generatePath(ROUTE_PATHS.VENUE_DETAIL, {
          venueId: String(venue.id),
        })}
      />

      <div className="pointer-events-none flex min-w-0 items-center gap-2">
        <div className="bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary/20 flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors md:size-10 lg:size-12">
          <Building2 className="size-1/2" aria-hidden />
        </div>

        <div className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-violet-700 md:text-base lg:text-lg">
          {venue.name}
        </div>
      </div>

      <div className="pointer-events-none grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-violet-100 bg-violet-100/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-violet-500">
            <Armchair className="size-3.5 shrink-0" aria-hidden />
            <span>좌석</span>
          </div>

          <p className="text-sm font-semibold whitespace-nowrap text-violet-900">{venue.venueSeatCount.toLocaleString()}석</p>
        </div>

        <div className="flex flex-col items-center gap-1 rounded-xl border border-sky-100 bg-sky-100/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-sky-500">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            <span>공연</span>
          </div>

          <p className="text-sm font-semibold whitespace-nowrap text-sky-900">{venue.concertCount.toLocaleString()}개</p>
        </div>
      </div>

      <div className="pointer-events-none border-t border-violet-100" />

      <div className="pointer-events-none flex items-center gap-2 text-xs font-medium text-slate-600">
        <Ruler className="size-4 shrink-0 text-amber-500" aria-hidden />
        <span className="whitespace-nowrap">
          {venue.width} &times; {venue.height}
        </span>
      </div>

      <div className="pointer-events-none border-t border-violet-100" />

      <VenueLocationLink searchText={venue.address} className="self-start">
        <span className="truncate whitespace-nowrap">{venue.address}</span>
      </VenueLocationLink>
    </div>
  );
};

export default VenueCard;
