import { SECTION_COLORS } from "@features/venue-form/model/venue-layout.constants";
import { getSectionColor } from "@features/venue-form/model/venue-layout.utils";

describe("venue layout utils", () => {
  it("같은 구역에는 같은 팔레트 색상을 반환한다", () => {
    expect(getSectionColor("A구역")).toBe(getSectionColor("A구역"));
    expect(SECTION_COLORS).toContain(getSectionColor("A구역"));
  });

  it("빈 구역명도 기본 문자열을 사용해 색상을 반환한다", () => {
    expect(SECTION_COLORS).toContain(getSectionColor(""));
  });
});
