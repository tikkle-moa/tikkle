import type { ConcertListFilterControlsProps } from "../model/concert-list-filter.types";

type ConcertListDateRangeControlsProps = Pick<ConcertListFilterControlsProps, "startDate" | "endDate" | "onStartDateChange" | "onEndDateChange">;

const ConcertListDateRangeControls = ({ startDate, endDate, onStartDateChange, onEndDateChange }: ConcertListDateRangeControlsProps) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500">
        시작일
        <input
          type="date"
          value={startDate}
          className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-500"
          onChange={(event) => onStartDateChange(event.target.value)}
        />
      </label>

      <label className="text-xs text-gray-500">
        종료일
        <input
          type="date"
          value={endDate}
          className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-500"
          onChange={(event) => onEndDateChange(event.target.value)}
        />
      </label>
    </div>
  );
};

export default ConcertListDateRangeControls;
