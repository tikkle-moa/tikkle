import type { ChangeEvent } from "react";

import VenueFilterControls from "./VenueFilterControls";

interface VenueFilterPanelProps {
  allRegions: string[];
  searchValue: string;
  selectedRegions: string[];
  minCapacity: number;
  activeFilterCount: number;
  onSearchInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleRegion: (region: string) => void;
  onChangeMinCapacity: (value: number) => void;
  onClearFilters: () => void;
}

const VenueFilterPanel = ({
  searchValue,
  allRegions,
  selectedRegions,
  minCapacity,
  activeFilterCount,
  onSearchInputChange,
  onToggleRegion,
  onChangeMinCapacity,
  onClearFilters,
}: VenueFilterPanelProps) => {
  return (
    <aside className="hidden w-56 shrink-0 self-start rounded-xl border border-violet-100 bg-violet-50/70 p-5 shadow-sm lg:sticky lg:top-4 lg:block">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-violet-950">필터</h2>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-violet-500 hover:underline disabled:text-violet-300"
          disabled={activeFilterCount === 0}
          onClick={onClearFilters}
        >
          초기화
        </button>
      </div>
      <VenueFilterControls
        allRegions={allRegions}
        searchValue={searchValue}
        selectedRegions={selectedRegions}
        minCapacity={minCapacity}
        idPrefix="desktop-venue-filter"
        onSearchInputChange={onSearchInputChange}
        onToggleRegion={onToggleRegion}
        onChangeMinCapacity={onChangeMinCapacity}
      />
    </aside>
  );
};

export default VenueFilterPanel;
