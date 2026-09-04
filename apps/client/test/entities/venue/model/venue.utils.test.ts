import { getVenueStageCornerRadius, getVenueStageTitleFontSize } from "@entities/venue";

describe("venue utils", () => {
  it("무대의 짧은 변을 기준으로 모서리 반경을 계산한다", () => {
    expect(getVenueStageCornerRadius(100, 40)).toBe(10);
  });

  it("무대 제목과 크기에 맞춰 글자 크기를 계산한다", () => {
    expect(getVenueStageTitleFontSize(100, 40, "LONG TITLE")).toBeCloseTo(100 / 7.5);
    expect(getVenueStageTitleFontSize(100, 40, " ")).toBeCloseTo(40 * 0.48);
  });
});
