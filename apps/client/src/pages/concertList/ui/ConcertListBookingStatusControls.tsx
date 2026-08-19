import { BOOKING_STATUS_MAP } from "@entities/concert";

const ConcertListBookingStatusControls = () => {
  return (
    <div className="flex flex-col gap-2.5">
      {Object.entries(BOOKING_STATUS_MAP)
        .filter(([status]) => status !== "ended")
        .map(([status, { label }]) => (
          <label key={status} className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" disabled className="size-4 accent-violet-600" />
            {label}
          </label>
        ))}
    </div>
  );
};

export default ConcertListBookingStatusControls;
