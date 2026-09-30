import type { ChangeEvent } from "react";

import VenueFilterControls from "./VenueFilterControls";

interface MobileVenueFilterPanelProps {
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

const MobileVenueFilterPanel = ({
  searchValue,
  allRegions,
  selectedRegions,
  minCapacity,
  activeFilterCount,
  onSearchInputChange,
  onToggleRegion,
  onChangeMinCapacity,
  onClearFilters,
}: MobileVenueFilterPanelProps) => (
  <div id="mobile-venue-filter-panel" className="mb-6 overflow-hidden rounded-xl border border-violet-100 bg-violet-50/70 shadow-sm lg:hidden">
    <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3">
      <p className="text-sm font-bold text-violet-950">필터</p>
      {activeFilterCount > 0 && (
        <button type="button" className="text-xs font-medium text-violet-600 hover:underline" onClick={onClearFilters}>
          초기화
        </button>
      )}
    </div>
    <div className="p-4">
      <VenueFilterControls
        allRegions={allRegions}
        searchValue={searchValue}
        selectedRegions={selectedRegions}
        minCapacity={minCapacity}
        idPrefix="mobile-venue-filter"
        onSearchInputChange={onSearchInputChange}
        onToggleRegion={onToggleRegion}
        onChangeMinCapacity={onChangeMinCapacity}
      />
    </div>
  </div>
);

export default MobileVenueFilterPanel;
