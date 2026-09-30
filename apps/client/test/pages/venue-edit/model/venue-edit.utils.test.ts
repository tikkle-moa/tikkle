import type { VenueDetailResponse } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form";

import { toUpdateVenueRequest } from "@pages/venue-edit/model/venue-edit.utils";

const initialValues: VenueDetailResponse = {
  venue: {
    id: 1,
    name: "기존 공연장",
    address: "기존 주소",
    description: "기존 설명",
    width: 100,
    height: 80,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 40,
    stageHeight: 10,
    createdAt: "2026-09-04T00:00:00Z",
  },
  venueSeats: [
    {
      id: 10,
      venueId: 1,
      sectionName: "A",
      seatNumber: 1,
      seatLabel: "A1",
      price: 10_000,
      positionX: 20,
      positionY: 30,
      createdAt: "2026-09-04T00:00:00Z",
    },
    {
      id: 20,
      venueId: 1,
      sectionName: "B",
      seatNumber: 1,
      seatLabel: "B1",
      price: 20_000,
      positionX: 40,
      positionY: 30,
      createdAt: "2026-09-04T00:00:00Z",
    },
  ],
};

const originalSeats: VenueFormSeat[] = initialValues.venueSeats.map(({ id, sectionName, seatNumber, seatLabel, price, positionX, positionY }) => ({
  clientId: id,
  sectionName,
  seatNumber,
  seatLabel,
  price,
  positionX,
  positionY,
}));

describe("toUpdateVenueRequest", () => {
  it("변경 사항이 없으면 빈 요청을 반환한다", () => {
    const { id: _, createdAt: __, ...venue } = initialValues.venue;
    expect(toUpdateVenueRequest(venue, originalSeats, initialValues)).toEqual({});
  });

  it("변경된 공연장 필드만 요청에 포함한다", () => {
    const { id: _, createdAt: __, ...venue } = initialValues.venue;
    const changedVenue = {
      ...venue,
      name: "수정 공연장",
      address: "수정 주소",
      description: null,
      width: 120,
      height: 90,
      stagePositionX: 60,
      stagePositionY: 15,
      stageWidth: 50,
      stageHeight: 12,
    };

    expect(toUpdateVenueRequest(changedVenue, originalSeats, initialValues).venue).toEqual(changedVenue);
  });

  it("새 좌석과 수정 좌석을 포함하고 삭제 좌석 ID를 구분한다", () => {
    const { id: _, createdAt: __, ...venue } = initialValues.venue;
    const updatedSeat = { ...originalSeats[0], sectionName: "C", seatNumber: 3, seatLabel: "C3", price: 30_000, positionX: 25, positionY: 35 };
    const newSeat: VenueFormSeat = { ...originalSeats[0], clientId: 21, seatNumber: 4, seatLabel: "A4" };

    expect(toUpdateVenueRequest(venue, [updatedSeat, newSeat], initialValues)).toEqual({
      venueSeats: [
        { sectionName: "A", seatNumber: 4, seatLabel: "A4", price: 10_000, positionX: 20, positionY: 30 },
        { id: 10, sectionName: "C", seatNumber: 3, seatLabel: "C3", price: 30_000, positionX: 25, positionY: 35 },
      ],
      deletedVenueSeatIds: [20],
    });
  });

  it.each([
    ["sectionName", "C"],
    ["seatNumber", 2],
    ["seatLabel", "A-1"],
    ["price", 11_000],
    ["positionX", 21],
    ["positionY", 31],
  ] as const)("좌석의 %s만 변경돼도 수정 좌석으로 포함한다", (field, value) => {
    const { id: _, createdAt: __, ...venue } = initialValues.venue;
    const changedSeat = { ...originalSeats[0], [field]: value };
    expect(toUpdateVenueRequest(venue, [changedSeat, originalSeats[1]], initialValues).venueSeats).toEqual([
      expect.objectContaining({ id: 10, [field]: value }),
    ]);
  });
});
