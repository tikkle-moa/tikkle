import type { BeginCheckoutReviewMessageData } from "@tikkle/api-types";

import type { PerformanceResponse } from "@entities/performance";
import type { VenueDetailResponse } from "@entities/venue";

import { getPerformanceCheckoutNavigation } from "@pages/performance-detail/model/performance-detail.utils";

const performance: PerformanceResponse = {
  id: 1,
  concertId: 10,
  venueId: 2,
  name: "Tikkle Live",
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: null,
  createdAt: "2026-08-25T12:00:00",
  status: "AVAILABLE",
};

const venueDetail: VenueDetailResponse = {
  venue: {
    id: 2,
    name: "티끌홀",
    address: "서울",
    description: null,
    width: 100,
    height: 80,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 40,
    stageHeight: 10,
    createdAt: "2026-08-25T12:00:00",
  },
  venueSeats: [],
};

const review: BeginCheckoutReviewMessageData = {
  reviewToken: "92334384-52d0-41f2-a3c1-3d54047c35b8",
  groupId: "group-1",
  performanceId: 1,
  venueSeatIds: [101],
  expiresAt: "2026-09-01T20:00:00.000Z",
};

describe("getPerformanceCheckoutNavigation", () => {
  it("공연과 공연장 정보로 checkout 이동 상태를 만든다", () => {
    expect(getPerformanceCheckoutNavigation({ performance, venueDetail, review })).toEqual({
      pathname: "/performances/1/checkout",
      state: { performance, venue: venueDetail.venue, venueSeats: venueDetail.venueSeats, review },
    });
  });

  it.each([
    { performance: undefined, venueDetail },
    { performance, venueDetail: undefined },
  ])("필수 정보가 없으면 이동 상태를 만들지 않는다", (missing) => {
    expect(getPerformanceCheckoutNavigation({ ...missing, review })).toBeNull();
  });
});
