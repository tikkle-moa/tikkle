import type { CreateVenueRequest, CreateVenueSeatRequest } from "@entities/venue";

import { toCreateVenueRequest, validateVenueForm } from "@features/venue-form/model/venue-form.utils";

const venue: CreateVenueRequest = {
  name: "공연장",
  address: "서울시",
  description: "설명",
  width: 100,
  height: 100,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 40,
  stageHeight: 10,
};

const seats: CreateVenueSeatRequest[] = [
  { sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 50_000, positionX: 20, positionY: 30 },
  { sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 50_000, positionX: 30, positionY: 30 },
];

describe("venue form utils", () => {
  it("유효한 공연장과 좌석은 오류가 없다", () => {
    expect(validateVenueForm(venue, seats)).toEqual({});
  });

  it("필수값과 숫자 범위를 검증한다", () => {
    const errors = validateVenueForm({ ...venue, name: " ", address: "", width: -1, stageWidth: 1_000 }, [
      { ...seats[0], sectionName: "", seatNumber: 0, seatLabel: "", price: -1, positionX: -1 },
    ]);

    expect(errors).toMatchObject({
      name: "공연장 이름을 입력해 주세요.",
      address: "주소를 입력해 주세요.",
      width: "0 이상 999,999.99 이하의 숫자를 입력해 주세요.",
      stageWidth: "0 이상 999.99 이하의 숫자를 입력해 주세요.",
      "seat.0.sectionName": "구역명을 입력해 주세요.",
      "seat.0.seatNumber": "좌석번호는 1 이상의 정수를 입력해 주세요.",
      "seat.0.seatLabel": "좌석 표시를 입력해 주세요.",
      "seat.0.price": "좌석 가격은 0 이상의 정수를 입력해 주세요.",
      "seat.0.positionX": "X 좌표는 0 이상 공연장 가로 길이 이하의 숫자를 입력해 주세요.",
    });
  });

  it("무대가 공연장 범위를 벗어나면 검증 오류를 반환한다", () => {
    expect(validateVenueForm({ ...venue, stagePositionX: 5 }, seats).stageWidth).toBe("무대가 공연장 범위를 벗어납니다.");
  });

  it("같은 구역의 중복 좌석 번호를 검증한다", () => {
    const errors = validateVenueForm(venue, [seats[0], { ...seats[1], seatNumber: 1 }]);
    expect(errors["seat.1.seatNumber"]).toBe("같은 구역에 중복된 좌석 번호가 있습니다.");
  });

  it("제출 요청의 문자열 앞뒤 공백을 제거한다", () => {
    expect(
      toCreateVenueRequest({ ...venue, name: " 공연장 ", address: " 서울시 ", description: " 설명 " }, [
        { ...seats[0], sectionName: " A ", seatLabel: " A1 " },
      ]),
    ).toEqual({
      venue: { ...venue, name: "공연장", address: "서울시", description: "설명" },
      venueSeats: [seats[0]],
    });
  });

  it("문자열 최대 길이와 빈 좌석 목록을 검증한다", () => {
    const errors = validateVenueForm(
      {
        ...venue,
        name: "가".repeat(101),
        address: "가".repeat(201),
        description: "가".repeat(10_001),
      },
      [],
    );
    expect(errors.name).toContain("100자");
    expect(errors.address).toContain("200자");
    expect(errors.description).toContain("10000자");
    expect(errors.venueSeats).toBe("좌석을 하나 이상 추가해 주세요.");
  });

  it("좌석 문자열 최대 길이와 Y 좌표 범위를 검증한다", () => {
    const errors = validateVenueForm(venue, [
      {
        ...seats[0],
        sectionName: "가".repeat(51),
        seatLabel: "가".repeat(51),
        positionY: 101,
      },
    ]);
    expect(errors["seat.0.sectionName"]).toContain("50자");
    expect(errors["seat.0.seatLabel"]).toContain("50자");
    expect(errors["seat.0.positionY"]).toContain("Y 좌표");
  });

  it("유한하지 않은 공연장과 좌석 숫자를 검증한다", () => {
    const errors = validateVenueForm({ ...venue, height: Number.NaN, stageHeight: Number.POSITIVE_INFINITY }, [
      { ...seats[0], positionX: Number.NaN, positionY: Number.NaN },
    ]);
    expect(errors.height).toBeTruthy();
    expect(errors.stageHeight).toBeTruthy();
    expect(errors["seat.0.positionX"]).toBeTruthy();
    expect(errors["seat.0.positionY"]).toBeTruthy();
  });

  it("공연장 크기가 잘못된 경우에도 좌석 좌표 안전 상한을 검증한다", () => {
    const errors = validateVenueForm({ ...venue, width: -1, height: -1 }, [{ ...seats[0], positionX: 1_000_000, positionY: 1_000_000 }]);
    expect(errors["seat.0.positionX"]).toBeTruthy();
    expect(errors["seat.0.positionY"]).toBeTruthy();
  });
});
