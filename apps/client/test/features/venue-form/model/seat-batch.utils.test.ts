import type { SeatBatchValues } from "@features/venue-form/model/seat-batch.types";
import { createSeatBatch, createVenueSeat, validateSeatBatch } from "@features/venue-form/model/seat-batch.utils";

const values: SeatBatchValues = {
  sectionName: " A구역 ",
  rows: 2,
  columns: 3,
  startSeatNumber: 10,
  price: 50_000,
  startX: 20,
  startY: 30,
  gapX: 10,
  gapY: 5,
};

describe("seat batch utils", () => {
  it("행과 열에 맞춰 좌석 번호와 좌표를 생성한다", () => {
    expect(createSeatBatch(values)).toEqual([
      { sectionName: "A구역", seatNumber: 10, seatLabel: "A구역 10번", price: 50_000, positionX: 20, positionY: 30 },
      { sectionName: "A구역", seatNumber: 11, seatLabel: "A구역 11번", price: 50_000, positionX: 30, positionY: 30 },
      { sectionName: "A구역", seatNumber: 12, seatLabel: "A구역 12번", price: 50_000, positionX: 40, positionY: 30 },
      { sectionName: "A구역", seatNumber: 13, seatLabel: "A구역 13번", price: 50_000, positionX: 20, positionY: 35 },
      { sectionName: "A구역", seatNumber: 14, seatLabel: "A구역 14번", price: 50_000, positionX: 30, positionY: 35 },
      { sectionName: "A구역", seatNumber: 15, seatLabel: "A구역 15번", price: 50_000, positionX: 40, positionY: 35 },
    ]);
  });

  it.each([
    [{ ...values, sectionName: " " }, "구역명을 입력해 주세요."],
    [{ ...values, rows: 0 }, "행은 1 이상의 정수여야 합니다."],
    [{ ...values, columns: 1.5 }, "열은 1 이상의 정수여야 합니다."],
    [{ ...values, rows: 21, columns: 25 }, "한 번에 최대 500석까지 생성할 수 있습니다."],
    [{ ...values, startSeatNumber: 0 }, "시작 번호는 1 이상의 정수여야 합니다."],
    [{ ...values, price: -1 }, "가격은 0 이상의 정수여야 합니다."],
    [{ ...values, gapX: 0 }, "좌석 간격은 0보다 커야 합니다."],
    [{ ...values, sectionName: "가".repeat(51) }, "구역명은 50자 이하로 입력해 주세요."],
  ])("잘못된 일괄 생성값을 검증한다", (invalidValues, expected) => {
    expect(validateSeatBatch(invalidValues as SeatBatchValues, 100, 100)).toBe(expected);
  });

  it("마지막 좌석이 공연장 밖으로 나가면 생성하지 않는다", () => {
    expect(validateSeatBatch({ ...values, startX: 90 }, 100, 100)).toBe("생성될 좌석이 공연장 범위를 벗어납니다.");
  });

  it("단일 좌석을 공연장 중앙에 생성한다", () => {
    expect(createVenueSeat(101, 81)).toEqual({
      sectionName: "",
      seatNumber: 0,
      seatLabel: "",
      price: 0,
      positionX: 50.5,
      positionY: 40.5,
    });
  });
});
