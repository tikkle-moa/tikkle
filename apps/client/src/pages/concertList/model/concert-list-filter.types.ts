export interface ConcertListFilterControlsProps {
  selectedGenres: string[];
  selectedBookingStatuses: string[];
  startDate: string;
  endDate: string;
  onToggleGenre: (genre: string) => void;
  onToggleBookingStatus: (status: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export interface ConcertListFilterPanelProps extends ConcertListFilterControlsProps {
  activeFilterCount: number;
  onClearFilters: () => void;
}
