import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

interface MobileConcertListFilterButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

const MobileConcertListFilterButton = ({ isOpen, onClick }: MobileConcertListFilterButtonProps) => {
  return (
    <button
      type="button"
      aria-controls="mobile-concert-list-filter-panel"
      aria-expanded={isOpen}
      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 lg:hidden"
      onClick={onClick}
    >
      <SlidersHorizontal size={16} />
      필터
      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  );
};

export default MobileConcertListFilterButton;
