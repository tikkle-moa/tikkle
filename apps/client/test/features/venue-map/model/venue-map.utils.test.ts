import { SECTION_COLOR_LIGHTNESS, SECTION_COLOR_SATURATION } from "@features/venue-map/model/venue-map.constants";
import {
  createSectionColorMap,
  createVenueSeatLabelMap,
  getOppositeTooltipPlacement,
  getSeatStatusMessage,
  isCurrentSeatSelectable,
} from "@features/venue-map/model/venue-map.utils";

describe("createSectionColorMap", () => {
  it("같은 공연장과 구역 목록에는 항상 같은 색상을 반환한다", () => {
    const sectionNames = ["A구역", "B구역"];

    expect(createSectionColorMap(1, sectionNames)).toEqual(createSectionColorMap(1, sectionNames));
  });

  it("구역 순서가 달라지거나 새 구역이 추가되어도 기존 구역 색상을 유지한다", () => {
    const initialColors = createSectionColorMap(1, ["A구역", "C구역"]);
    const extendedColors = createSectionColorMap(1, ["C구역", "B구역", "A구역"]);

    expect(extendedColors["A구역"]).toBe(initialColors["A구역"]);
    expect(extendedColors["C구역"]).toBe(initialColors["C구역"]);
  });

  it("생성한 색상은 정해진 채도와 명도를 사용한다", () => {
    const colors = createSectionColorMap(1, ["A구역", "B구역"]);
    const colorPattern = new RegExp(`^hsl\\(\\d+ ${SECTION_COLOR_SATURATION}% ${SECTION_COLOR_LIGHTNESS}%\\)$`);

    expect(colors["A구역"]).toMatch(colorPattern);
    expect(colors["B구역"]).toMatch(colorPattern);
  });
});

describe("seat status utilities", () => {
  it("좌석 ID별 접근성 label을 생성한다", () => {
    const labels = createVenueSeatLabelMap([
      { id: 1, seatLabel: "A구역 1번", price: 15000 },
      { id: 2, seatLabel: "A구역 2번", price: 20000 },
    ] as never);

    expect(labels).toEqual(
      new Map([
        [1, "A구역 1번, 15,000원"],
        [2, "A구역 2번, 20,000원"],
      ]),
    );
  });

  it("좌석 상태별 메시지를 반환한다", () => {
    expect(getSeatStatusMessage("available").description).toBe("선택 가능한 좌석입니다.");
    expect(getSeatStatusMessage("booked").description).toBe("예약이 완료된 좌석입니다.");
    expect(getSeatStatusMessage("held_by_other_group").description).toContain("다른 관람객이 Hold");
    expect(getSeatStatusMessage("held_by_other_group", new Date(120_000), 0).description).toContain("Hold 중입니다.");
    expect(getSeatStatusMessage("held_by_my_group", new Date(120_000), 0).description).toContain("Hold 중입니다.");
    expect(getSeatStatusMessage("held_by_my_group").description).toBe("Hold 중인 좌석입니다.");
    expect(getSeatStatusMessage("held_by_other_group", new Date(Number.NaN), 0).description).toBe("다른 관람객이 Hold 중인 좌석입니다.");
    expect(getSeatStatusMessage("held_by_my_group", new Date(15_000), 0).description).toContain("15초 남음");
    expect(getSeatStatusMessage("held_by_my_group", new Date(0), 1_000).description).toContain("곧 만료");
  });

  it("tooltip 방향의 네 가지 조합을 반환한다", () => {
    expect(getOppositeTooltipPlacement(true, true)).toBe("bottom-right");
    expect(getOppositeTooltipPlacement(true, false)).toBe("bottom-left");
    expect(getOppositeTooltipPlacement(false, true)).toBe("top-right");
    expect(getOppositeTooltipPlacement(false, false)).toBe("top-left");
  });

  it.each([
    ["available", true],
    ["held_by_my_group", true],
    ["held_by_other_group", false],
    ["booked", false],
    [undefined, false],
  ] as const)("%s 상태의 현재 선택 가능 여부를 반환한다", (status, expected) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (status) element.dataset.seatStatus = status;

    expect(isCurrentSeatSelectable(element)).toBe(expected);
  });
});
