import { Link, generatePath } from "react-router";

import { Armchair, Building2, CalendarDays, MapPinned, Ruler } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import type { VenueResponse } from "@entities/venue";

interface VenueCardProps {
  venue: VenueResponse;
}

const VenueCard = ({ venue }: VenueCardProps) => {
  return (
    <div className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <Link to={generatePath(ROUTE_PATHS.VENUE_DETAIL, { venueId: String(venue.id) })} className="flex flex-1 flex-col gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary/15 flex size-8 shrink-0 items-center justify-center rounded-xl transition md:size-10 lg:size-12">
            <Building2 className="size-1/2" aria-hidden />
          </div>

          <div className="truncate text-sm font-bold text-slate-900 md:text-base lg:text-lg">{venue.name}</div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-slate-500">
              <Armchair className="size-3.5 shrink-0" aria-hidden />
              <span>좌석</span>
            </div>

            <p className="text-sm font-semibold whitespace-nowrap text-slate-800">{venue.venueSeatCount.toLocaleString()}석</p>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-slate-500">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden />
              <span>공연</span>
            </div>

            <p className="text-sm font-semibold whitespace-nowrap text-slate-800">{venue.concertCount.toLocaleString()}개</p>
          </div>
        </div>
        <div className="border-t border-slate-200" />
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Ruler className="size-4 shrink-0" aria-hidden />
          <span className="whitespace-nowrap">
            {venue.width} × {venue.height}
          </span>
        </div>
      </Link>

      <div className="border-t border-slate-200" />
      <a
        href={`https://map.naver.com/p/search/${encodeURIComponent(venue.address)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${venue.address} 네이버 지도로 보기, 새 탭`}
        className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-violet-600 hover:underline focus-visible:text-violet-600 focus-visible:underline"
      >
        <MapPinned className="size-4 shrink-0" aria-hidden />
        <span className="truncate whitespace-nowrap">{venue.address}</span>
      </a>
    </div>
  );
};

export default VenueCard;
