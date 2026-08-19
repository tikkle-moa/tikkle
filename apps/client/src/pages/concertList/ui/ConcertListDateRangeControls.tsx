const ConcertListDateRangeControls = () => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500">
        시작일
        <input type="date" disabled className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-500" />
      </label>

      <label className="text-xs text-gray-500">
        종료일
        <input type="date" disabled className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-500" />
      </label>
    </div>
  );
};

export default ConcertListDateRangeControls;
