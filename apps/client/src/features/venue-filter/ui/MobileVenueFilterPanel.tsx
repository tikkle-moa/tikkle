import type { ChangeEvent } from "react";

import VenueFilterControls from "./VenueFilterControls";

interface MobileVenueFilterPanelProps {
  searchValue: string;
  allRegions: string[];
  selectedRegions: string[];
  activeFilterCount: number;
  onSearchInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleRegion: (region: string) => void;
  onClearFilters: () => void;
}

const MobileVenueFilterPanel = ({
  searchValue,
  allRegions,
  selectedRegions,
  activeFilterCount,
  onSearchInputChange,
  onToggleRegion,
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
        searchValue={searchValue}
        allRegions={allRegions}
        selectedRegions={selectedRegions}
        onSearchInputChange={onSearchInputChange}
        onToggleRegion={onToggleRegion}
        idPrefix="mobile-venue-filter"
      />
    </div>
  </div>
);

export default MobileVenueFilterPanel;
