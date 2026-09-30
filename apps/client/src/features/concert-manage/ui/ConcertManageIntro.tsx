import type { LucideIcon } from "lucide-react";

interface ConcertManageIntroProps {
  title: string;
  description: string;
  Icon: LucideIcon;
}

const ConcertManageIntro = ({ title, description, Icon }: ConcertManageIntroProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
      <div className="bg-brand-primary/5 pointer-events-none absolute -top-24 -right-14 size-56 rounded-full" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 -left-16 size-52 rounded-full bg-violet-50" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-start text-left">
        <div className="border-brand-primary/10 bg-brand-primary/5 text-brand-primary mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-sm">
          <span className="bg-brand-primary flex size-6 items-center justify-center rounded-full text-white shadow-sm">
            <Icon className="size-3.5" aria-hidden />
          </span>
          콘서트 관리
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">{description}</p>
      </div>
    </div>
  );
};

export default ConcertManageIntro;
