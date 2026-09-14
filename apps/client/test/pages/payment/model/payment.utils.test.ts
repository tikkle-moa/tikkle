import { toPositiveAmount } from "@pages/payment/model/payment.utils";

describe("payment page utils", () => {
  it("양의 정수 결제 금액만 반환한다", () => {
    expect(toPositiveAmount("132000")).toBe(132000);
    expect(toPositiveAmount("0")).toBeNull();
    expect(toPositiveAmount("-1")).toBeNull();
    expect(toPositiveAmount("132000.5")).toBeNull();
    expect(toPositiveAmount(null)).toBeNull();
  });
});
