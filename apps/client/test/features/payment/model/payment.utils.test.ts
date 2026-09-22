import { getPaymentCustomerKey } from "@features/payment/model/payment.utils";

describe("payment.utils", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "0e9855c5-99ae-4ef2-a118-9042a8d785f2") });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("고객 키는 사용자별로 sessionStorage에 보관하고 재사용한다", () => {
    expect(getPaymentCustomerKey(1)).toBe("tikkle_0e9855c5-99ae-4ef2-a118-9042a8d785f2");
    expect(getPaymentCustomerKey(1)).toBe("tikkle_0e9855c5-99ae-4ef2-a118-9042a8d785f2");
    expect(getPaymentCustomerKey(2)).toBe("tikkle_0e9855c5-99ae-4ef2-a118-9042a8d785f2");
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
  });
});
