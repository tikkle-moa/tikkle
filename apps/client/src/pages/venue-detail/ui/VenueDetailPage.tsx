import { Link, generatePath } from "react-router";

import { MapPinned, Pencil, Trash } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import DetailMessage from "@shared/ui/DetailMessage";

import { VenueMap } from "@features/venue-map";

import VenueDetailSkeleton from "./VenueDetailSkeleton";

import { useVenueDetail } from "../model/use-venue-detail";

const VenueDetailPage = () => {
  const { isParamValid, isAdmin, venue, venueSeats, isPending, isError, handleDelete } = useVenueDetail();

  if (!isParamValid) {
    return <DetailMessage title="잘못된 공연장입니다." description="올바르지 않은 공연장 ID입니다." />;
  }

  if (isPending) {
    return <VenueDetailSkeleton />;
  }

  if (isError || !venue) {
    return <DetailMessage title="공연장 정보를 불러오지 못했습니다." description="잠시 후 다시 시도해 주세요." />;
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
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-violet-200">
              <MapPinned className="size-3.5" aria-hidden />
              공연장 안내
            </span>
            {isAdmin && (
              <div className="flex items-center gap-4">
                <Link
                  aria-label={`${venue.name} 수정`}
                  className="relative z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:border-white/40 hover:bg-white/25"
                  to={generatePath(ROUTE_PATHS.VENUE_EDIT, {
                    venueId: String(venue.id),
                  })}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  수정
                </Link>
                <button
                  aria-label={`${venue.name} 삭제`}
                  className="relative z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:border-white/40 hover:bg-white/25"
                  onClick={handleDelete}
                >
                  <Trash className="size-3.5" aria-hidden />
                  삭제
                </button>
              </div>
            )}
          </div>

          <h1 id="venue-detail-title" className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            {venue.name}
          </h1>

          <a
            href={`https://map.naver.com/p/search/${encodeURIComponent(venue.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${venue.address} 네이버 지도로 보기, 새 탭`}
            className="group relative mt-3 inline-flex items-start gap-1.5 text-sm text-violet-100 transition-colors hover:text-white hover:underline focus-visible:text-white focus-visible:underline"
          >
            <MapPinned className="mt-0.5 size-4 shrink-0" aria-hidden />
            {venue.address}

            <span
              role="tooltip"
              className="pointer-events-none absolute -top-9 left-0 hidden -translate-y-1 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-all group-hover:block group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:block group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:block"
            >
              네이버 지도로 보기
            </span>
          </a>

          {venue.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-violet-100">{venue.description}</p>}
        </div>
      </section>

      <VenueMap venue={venue} venueSeats={venueSeats} />
    </div>
  );
};

export default VenueDetailPage;
