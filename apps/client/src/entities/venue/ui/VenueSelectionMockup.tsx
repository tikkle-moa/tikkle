import { MOCK_GROUP_MEMBERS, MOCK_VENUE_SEAT_BOARD } from "../model/mock-venue-seat.constants";
import { VENUE_SEAT_STYLE_MAP } from "../model/venue-seat.constants";

const VenueSelectionMockup = () => (
  <div className="relative w-full max-w-xs">
    <div className="text-brand-primary absolute -top-3 -right-3 z-10 flex items-center gap-1 rounded-full border border-gray-100 bg-white px-2.5 py-1 text-xs font-bold shadow-md">
      ⏱ 03:42 남음
    </div>

    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
      <div className="bg-gray-50 py-2.5 text-center text-xs font-semibold tracking-widest text-gray-400 uppercase">STAGE</div>

      <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-3">
        {MOCK_VENUE_SEAT_BOARD.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((status, columnIndex) => (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className={`h-7 w-7 rounded-md border transition sm:h-8 sm:w-8 ${VENUE_SEAT_STYLE_MAP[status].style}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500">
        {Object.values(VENUE_SEAT_STYLE_MAP).map(({ label, style }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block size-2.5 rounded-sm border ${style}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
        <div className="flex -space-x-2">
          {MOCK_GROUP_MEMBERS.map(({ initial, color }) => (
            <div
              key={initial}
              className="flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {initial}
            </div>
          ))}
        </div>

        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
          {MOCK_GROUP_MEMBERS.length}명 함께 보는 중
        </span>
      </div>
    </div>
  </div>
);

export default VenueSelectionMockup;
