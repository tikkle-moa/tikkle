import type { LucideIcon } from "lucide-react";

interface VenueManageIntroProps {
  title: string;
  description: string;
  Icon: LucideIcon;
}

const VenueManageIntro = ({ title, description, Icon }: VenueManageIntroProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-violet-500 to-fuchsia-400" aria-hidden />
      <div className="pointer-events-none absolute -top-24 -right-14 size-56 rounded-full bg-violet-100/70" aria-hidden />
      <div className="pointer-events-none absolute -right-10 -bottom-32 size-56 rounded-full bg-fuchsia-50" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-start text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 sm:text-sm">
          <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
            <Icon className="size-3.5" aria-hidden />
          </span>
          공연장 관리
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>

        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">{description}</p>
      </div>
    </div>
  );
};

export default VenueManageIntro;
