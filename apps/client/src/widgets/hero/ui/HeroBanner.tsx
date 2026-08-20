import { Link } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { SeatSelectionMockup } from "@features/seat";

const HeroBanner = () => (
  <div
    className="relative h-full overflow-hidden px-10 py-5 sm:px-20 sm:py-10"
    style={{
      background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 40%, #c026d3 80%, #ec4899 100%)",
    }}
  >
    <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
    <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5" />

    <div className="relative flex h-full flex-row items-center justify-between">
      <div className="flex flex-1 flex-col justify-center gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-300" />
          그룹 콘서트 예매 서비스
        </span>

        <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-white md:text-3xl lg:text-4xl">
          모두가 같은 화면에서
          <br />
          함께 티켓을 고릅니다
        </h1>

        <p className="hidden max-w-xs text-base leading-relaxed text-white/75 md:block">
          메신저로 좌석 번호를 주고받는 건 이제 그만.
          <br />
          Tikkle에서는 일행 모두가 실시간으로 함께 예매합니다.
        </p>

        <div className="pt-1">
          <Link
            to={ROUTE_PATHS.CONCERT_LIST}
            className="text-brand-primary inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1 text-sm font-bold shadow-md transition hover:bg-white/90 md:px-6 md:py-2"
          >
            콘서트 보러가기
          </Link>
        </div>
      </div>

      <div className="hidden md:flex">
        <SeatSelectionMockup />
      </div>
    </div>
  </div>
);

export default HeroBanner;
