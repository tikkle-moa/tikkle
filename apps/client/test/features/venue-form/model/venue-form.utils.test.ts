import type { CreateVenueRequest } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";
import {
  createVenueSeat,
  getErrorSections,
  getVenueSeatClassName,
  replaceVenueSeatCollisionErrors,
  toCreateVenueRequest,
  validateVenueForm,
} from "@features/venue-form/model/venue-form.utils";

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

const seats: VenueFormSeat[] = [
  { clientId: 1, sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 50_000, positionX: 20, positionY: 30 },
  { clientId: 2, sectionName: "A", seatNumber: 2, seatLabel: "A2", price: 50_000, positionX: 30, positionY: 30 },
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
      "seat.1.sectionName": "구역명을 입력해 주세요.",
      "seat.1.seatNumber": "좌석번호는 1 이상의 정수를 입력해 주세요.",
      "seat.1.seatLabel": "좌석 표시를 입력해 주세요.",
      "seat.1.price": "좌석 가격은 0 이상의 정수를 입력해 주세요.",
    });
  });

  it("무대가 공연장 범위를 벗어나면 검증 오류를 반환한다", () => {
    expect(validateVenueForm({ ...venue, stagePositionX: 5 }, seats).stageWidth).toBe("무대가 공연장 범위를 벗어납니다.");
  });

  it("좌석 크기를 포함한 영역이 공연장 경계를 벗어나면 좌표 오류를 반환한다", () => {
    const errors = validateVenueForm(venue, [
      { ...seats[0], positionX: 2.24 },
      { ...seats[1], positionY: 98.26 },
    ]);

    expect(errors["seat.1.positionX"]).toContain("2.25 이상");
    expect(errors["seat.2.positionY"]).toContain("98.25 이하");
  });

  it("좌석 영역이 무대와 겹치면 좌석 좌표 오류를 반환한다", () => {
    const errors = validateVenueForm(venue, [{ ...seats[0], positionX: 50, positionY: 10 }]);

    expect(errors["seat.1.positionX"]).toContain("겹치는 영역: 무대");
    expect(errors["seat.1.positionY"]).toContain("겹치는 영역: 무대");
  });

  it("같은 구역의 중복 좌석 번호를 검증한다", () => {
    const errors = validateVenueForm(venue, [seats[0], { ...seats[1], seatNumber: 1 }]);
    expect(errors["seat.2.seatNumber"]).toBe("같은 구역에 중복된 좌석 번호가 있습니다.");
  });

  it("렌더링 영역이 겹치는 좌석을 모두 검증한다", () => {
    const overlappingSeat = {
      ...seats[1],
      sectionName: "B",
      positionX: 24.49,
      positionY: 33.49,
    };

    const errors = validateVenueForm(venue, [seats[0], overlappingSeat]);

    expect(errors["seat.1.positionX"]).toContain("겹치는 영역: A2");
    expect(errors["seat.2.positionX"]).toContain("겹치는 영역: A1");
    expect(errors["seat.2.seatNumber"]).toBeUndefined();
  });

  it("좌석 표시가 없으면 구역명과 목록 순서로 충돌 좌석을 안내한다", () => {
    const errors = validateVenueForm(venue, [
      { ...seats[0], seatLabel: "" },
      { ...seats[1], sectionName: "", seatLabel: "", positionX: 24, positionY: 33 },
    ]);

    expect(errors["seat.1.positionX"]).toContain("겹치는 영역: 좌석 2");
    expect(errors["seat.2.positionX"]).toContain("겹치는 영역: 좌석 1");
  });

  it("제출 요청의 문자열 앞뒤 공백을 제거한다", () => {
    expect(
      toCreateVenueRequest({ ...venue, name: " 공연장 ", address: " 서울시 ", description: " 설명 " }, [
        { ...seats[0], sectionName: " A ", seatLabel: " A1 " },
      ]),
    ).toEqual({
      venue: { ...venue, name: "공연장", address: "서울시", description: "설명" },
      venueSeats: [{ sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 50_000, positionX: 20, positionY: 30 }],
    });
  });

  it("공연장 설명이 null이면 생성 요청에도 null을 유지한다", () => {
    expect(toCreateVenueRequest({ ...venue, description: null }, [])).toMatchObject({
      venue: { description: null },
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
    expect(errors["seat.1.sectionName"]).toContain("50자");
    expect(errors["seat.1.seatLabel"]).toContain("50자");
    expect(errors["seat.1.positionY"]).toContain("Y 좌표");
  });

  it("유한하지 않은 공연장과 좌석 숫자를 검증한다", () => {
    const errors = validateVenueForm({ ...venue, height: Number.NaN, stageHeight: Number.POSITIVE_INFINITY }, [
      { ...seats[0], positionX: Number.NaN, positionY: Number.NaN },
    ]);
    expect(errors.height).toBeTruthy();
    expect(errors.stageHeight).toBeTruthy();
    expect(errors["seat.1.positionX"]).toBeTruthy();
    expect(errors["seat.1.positionY"]).toBeTruthy();
  });

  it("공연장 크기가 잘못된 경우에도 좌석 좌표 안전 상한을 검증한다", () => {
    const errors = validateVenueForm({ ...venue, width: -1, height: -1 }, [{ ...seats[0], positionX: 1_000_000, positionY: 1_000_000 }]);
    expect(errors["seat.1.positionX"]).toBeTruthy();
    expect(errors["seat.1.positionY"]).toBeTruthy();
  });

  it("단일 좌석을 공연장 범위 내의 랜덤 좌표에 생성한다", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);

    expect(createVenueSeat(101, 81, 7)).toEqual({
      clientId: 7,
      sectionName: "",
      seatNumber: 1,
      seatLabel: "",
      price: 0,
      positionX: 25.25,
      positionY: 60.75,
    });
  });

  it("오류 키를 기본 정보, 레이아웃, 좌석 및 기타 영역으로 중복 없이 분류한다", () => {
    expect(getErrorSections(["name", "address", "width", "stageHeight", "venueSeats", "seat.0.seatNumber", "unknown"])).toEqual([
      "기본 정보",
      "공연장 및 무대 크기",
      "좌석 정보",
      "기타",
    ]);
    expect(getErrorSections([])).toEqual([]);
  });

  it("기존 좌표 오류를 제거하고 현재 충돌 오류로 교체한다", () => {
    const errors = replaceVenueSeatCollisionErrors(
      { name: "이름 오류", "seat.1.positionX": "이전 좌표 오류", "seat.1.seatLabel": "표시 오류" },
      seats,
      new Map([[1, new Set([2])]]),
    );

    expect(errors.name).toBe("이름 오류");
    expect(errors["seat.1.seatLabel"]).toBe("표시 오류");
    expect(errors["seat.1.positionX"]).toContain("겹치는 영역: A2");
    expect(errors["seat.1.positionY"]).toContain("겹치는 영역: A2");
  });

  it("좌석 목록 상태에 맞는 클래스를 반환한다", () => {
    expect(getVenueSeatClassName(true, true)).toContain("border-red-300");
    expect(getVenueSeatClassName(false, true)).toContain("border-violet-300");
    expect(getVenueSeatClassName(false, false)).toContain("border-slate-200");
  });
});
