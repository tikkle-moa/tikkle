import { formatPrice, toRound } from "@shared/lib/number.utils";

describe("number.utils", () => {
  it("브라우저 로케일에 맞춰 가격을 표시한다", () => {
    expect(formatPrice(132000)).toBe(`${(132000).toLocaleString()}원`);
  });

  it("부동소수점 오차를 보정해 지정한 자릿수로 반올림한다", () => {
    expect(toRound(1.005, 2)).toBe(1.01);
    expect(toRound(10.555, 1)).toBe(10.6);
  });
});
