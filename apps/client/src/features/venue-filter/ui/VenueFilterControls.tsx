import type { ChangeEvent } from "react";

import { Search } from "lucide-react";

interface VenueFilterControlsProps {
  allRegions: string[];
  searchValue: string;
  selectedRegions: string[];
  minCapacity: number;
  idPrefix: string;
  onSearchInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleRegion: (region: string) => void;
  onChangeMinCapacity: (value: number) => void;
}

const VenueFilterControls = ({
  allRegions,
  searchValue,
  selectedRegions,
  minCapacity,
  idPrefix,
  onSearchInputChange,
  onToggleRegion,
  onChangeMinCapacity,
}: VenueFilterControlsProps) => {
  return (
    <div className="space-y-5">
      <section aria-labelledby={`${idPrefix}-keyword`}>
        <h3 id={`${idPrefix}-keyword`} className="mb-3 text-sm font-bold text-gray-900">
          공연장 검색
        </h3>
        <label className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2">
          <Search className="size-4 shrink-0 text-violet-400" aria-hidden />
          <span className="sr-only">이름 또는 주소 검색</span>
          <input
            type="search"
            value={searchValue}
            placeholder="이름, 주소"
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
            onChange={onSearchInputChange}
          />
        </label>
      </section>

      <section className="border-t border-violet-100 pt-5" aria-labelledby={`${idPrefix}-region`}>
        <h3 id={`${idPrefix}-region`} className="mb-3 text-sm font-bold text-gray-900">
          지역
        </h3>
        {allRegions.length === 0 ? (
          <p className="text-xs text-slate-400">선택 가능한 지역이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allRegions.map((region) => {
              const isSelected = selectedRegions.includes(region);
              return (
                <button
                  key={region}
                  type="button"
                  aria-pressed={isSelected}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected ? "border-violet-600 bg-violet-600 text-white" : "border-violet-200 bg-white text-violet-700 hover:border-violet-400"
                  }`}
                  onClick={() => onToggleRegion(region)}
                >
                  {region}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-violet-100 pt-5" aria-labelledby={`${idPrefix}-capacity`}>
        <h3 id={`${idPrefix}-capacity`} className="mb-3 text-sm font-bold text-gray-900">
          최소 수용 인원
        </h3>
        <input
          type="number"
          value={minCapacity}
          min={0}
          className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          onChange={(event) => onChangeMinCapacity(Number(event.target.value))}
        />
      </section>
    </div>
  );
};

export default VenueFilterControls;
