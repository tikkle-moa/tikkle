import { SECTION_COLOR_LIGHTNESS, SECTION_COLOR_SATURATION } from "@features/venue-map/model/venue-map.constants";
import { createSectionColorMap } from "@features/venue-map/model/venue-map.utils";

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
