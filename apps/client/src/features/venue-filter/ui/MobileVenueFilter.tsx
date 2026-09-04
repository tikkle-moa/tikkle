import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

interface MobileVenueFilterProps {
  isOpen: boolean;
  activeFilterCount: number;
  onToggle: () => void;
}

const MobileVenueFilter = ({ isOpen, activeFilterCount, onToggle }: MobileVenueFilterProps) => {
  return (
    <button
      type="button"
      aria-controls="mobile-venue-filter-panel"
      aria-expanded={isOpen}
      aria-label={activeFilterCount > 0 ? `필터 ${activeFilterCount}개 선택됨` : "필터"}
      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 lg:hidden"
      onClick={onToggle}
    >
      {activeFilterCount > 0 ? (
        <span aria-hidden className="flex size-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
          {activeFilterCount}
        </span>
      ) : (
        <SlidersHorizontal size={16} aria-hidden />
      )}
      필터
      {isOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
    </button>
  );
};

export default MobileVenueFilter;
