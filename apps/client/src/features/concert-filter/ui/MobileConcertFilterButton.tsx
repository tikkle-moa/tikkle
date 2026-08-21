import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

interface MobileConcertFilterButtonProps {
  isOpen: boolean;
  activeFilterCount: number;
  onClick: () => void;
}

const MobileConcertFilterButton = ({ isOpen, activeFilterCount, onClick }: MobileConcertFilterButtonProps) => {
  return (
    <button
      type="button"
      aria-controls="mobile-concert-filter-panel"
      aria-expanded={isOpen}
      aria-label={activeFilterCount > 0 ? `필터 ${activeFilterCount}개 선택됨` : "필터"}
      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 lg:hidden"
      onClick={onClick}
    >
      {activeFilterCount > 0 ? (
        <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
          {activeFilterCount}
        </span>
      ) : (
        <SlidersHorizontal aria-hidden="true" size={16} />
      )}
      필터
      {isOpen ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
    </button>
  );
};

export default MobileConcertFilterButton;
