import { render, screen } from "@testing-library/react";

import type { VenueSeatResponse } from "@entities/venue";

import VenueMapSeatTooltip from "@features/venue-map/ui/VenueMapSeatTooltip";
import VenueMapSelectedSeatStatus from "@features/venue-map/ui/VenueMapSelectedSeatStatus";

vi.mock("@features/venue-map/model/venue-map-clock-context", () => ({
  useVenueMapClock: () => undefined,
}));

const seat = {
  id: 1,
  seatLabel: "A구역 1열 1번",
  price: 150000,
} as VenueSeatResponse;

describe("venue map clock fallback", () => {
  it("시계 값이 없으면 hold 안내가 만료 시각만으로 렌더링된다", () => {
    render(
      <>
        <VenueMapSelectedSeatStatus status="held_by_my_group" expiresAt={new Date(Date.now() + 60000)} serverTimeOffset={0} />
        <VenueMapSeatTooltip
          seat={seat}
          status="held_by_my_group"
          expiresAt={new Date(Date.now() + 60000)}
          position={{ left: 20, top: 28, bottom: 31.5 }}
          serverTimeOffset={0}
        />
      </>,
    );

    expect(screen.getAllByText(/까지 Hold 중입니다/)).toHaveLength(2);
  });
});
