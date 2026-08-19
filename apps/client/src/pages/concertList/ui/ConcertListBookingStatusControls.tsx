import { BOOKING_STATUS_MAP } from "@entities/concert";

const ConcertListBookingStatusControls = () => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:flex-col lg:items-start lg:gap-2.5">
      {Object.entries(BOOKING_STATUS_MAP)
        .filter(([status]) => status !== "ended")
        .map(([status, { label }]) => (
          <label key={status} className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap text-gray-600">
            <input type="checkbox" disabled className="size-4 accent-violet-600" />
            {label}
          </label>
        ))}
    </div>
  );
};

export default ConcertListBookingStatusControls;
