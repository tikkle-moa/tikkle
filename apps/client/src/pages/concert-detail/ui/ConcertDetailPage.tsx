import { Link, generatePath } from "react-router";

import { Info, MapPin, Music, Pencil } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { CONCERT_GENRE_MAP } from "@entities/concert";
import { getPeriod } from "@entities/performance";

import ConcertDetailMessage from "./ConcertDetailMessage";
import ConcertDetailSkeleton from "./ConcertDetailSkeleton";
import PerformanceBookingPanel from "./PerformanceBookingPanel";

import { useConcertDetail } from "../model/use-concert-detail";

const ConcertDetailPage = () => {
  const { concert, performances, isAdmin, isError, isParamValid, isPending } = useConcertDetail();

  if (!isParamValid) {
    return <ConcertDetailMessage title="잘못된 공연입니다." description="올바르지 않은 콘서트 ID입니다." />;
  }

  if (isPending) {
    return <ConcertDetailSkeleton />;
  }

  if (isError || !concert) {
    return <ConcertDetailMessage title="공연 정보를 불러오지 못했습니다." description="잠시 후 다시 시도해 주세요." />;
  }

  const genre = CONCERT_GENRE_MAP[concert.genre];
  const period = performances.length === 0 ? "회차 준비 중" : getPeriod(performances);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)_20.5rem]">
        <div className="aspect-3/4 overflow-hidden rounded-xl bg-gray-100">
          {concert.posterUrl ? (
            <img alt={concert.title} className="h-full w-full object-cover" src={concert.posterUrl} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-linear-to-br from-indigo-950 via-purple-950 to-fuchsia-950 px-6 text-center text-white">
              <Music className="size-10 text-violet-300/70" aria-hidden />
              <p className="text-sm font-bold">{concert.title}</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${genre.className}`}>{genre.label}</span>

            {isAdmin && (
              <Link
                aria-label={`${concert.title} 수정`}
                className="hover:text-brand-primary inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-violet-200 hover:bg-violet-50"
                to={generatePath(ROUTE_PATHS.CONCERT_EDIT, {
                  concertId: String(concert.id),
                })}
              >
                <Pencil className="size-3.5" aria-hidden />
                수정
              </Link>
            )}
          </div>

          <h1 className="mt-3 text-3xl leading-tight font-bold tracking-tight text-gray-900">{concert.title}</h1>

          <dl className="mt-6 divide-y divide-gray-200 border-y border-gray-200 text-sm">
            <div className="grid grid-cols-[5rem_1fr] gap-3 py-3">
              <dt className="text-gray-400">공연 장소</dt>
              <dd className="flex items-center gap-1.5 font-medium text-gray-700">
                <MapPin className="size-4 text-gray-400" aria-hidden />
                {concert.placeName}
              </dd>
            </div>

            <div className="grid grid-cols-[5rem_1fr] gap-3 py-3">
              <dt className="text-gray-400">공연 기간</dt>
              <dd className="font-medium text-gray-700">{period}</dd>
            </div>
          </dl>

          <div className="mt-5 flex gap-2 rounded-lg bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-800">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>현재 예매 가능한 회차를 준비하고 있어요. 회차가 열리면 좌석을 선택할 수 있습니다.</p>
          </div>
        </div>

        <PerformanceBookingPanel performances={performances} />
      </section>

      <section className="mt-12 border-t-8 border-gray-100 pt-10 lg:pr-90">
        <h2 className="text-xl font-bold text-gray-900">공연 소개</h2>

        <p className="mt-4 text-sm leading-7 whitespace-pre-line text-gray-600">{concert.description ?? "공연 상세 정보를 준비 중입니다."}</p>
      </section>
    </div>
  );
};

export default ConcertDetailPage;
