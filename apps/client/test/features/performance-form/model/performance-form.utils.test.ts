import { getInitialPerformanceFormValues, validatePerformanceForm } from "@features/performance-form/model/performance-form.utils";

describe("getInitialPerformanceFormValues", () => {
  it("입력값이 없으면 빈 회차 폼 값을 반환한다", () => {
    expect(getInitialPerformanceFormValues()).toEqual({
      startsAt: "",
      bookingOpensAt: "",
    });
  });

  it("전달된 초기값을 빈 기본값에 병합한다", () => {
    expect(
      getInitialPerformanceFormValues({
        startsAt: "2099-09-01T19:00",
      }),
    ).toEqual({
      startsAt: "2099-09-01T19:00",
      bookingOpensAt: "",
    });
  });
});

describe("validatePerformanceForm", () => {
  it("공연 시작 시각이 없으면 오류를 반환한다", () => {
    expect(
      validatePerformanceForm({
        startsAt: "",
        bookingOpensAt: "",
      }),
    ).toEqual({
      startsAt: "공연 시작 시각을 입력해 주세요.",
    });
  });

  it("예매 시작 시각은 선택 입력이다", () => {
    expect(
      validatePerformanceForm({
        startsAt: "2099-09-01T19:00",
        bookingOpensAt: "",
      }),
    ).toEqual({});
  });

  it("예매 시작 시각이 공연 시작 시각 이후면 오류를 반환한다", () => {
    expect(
      validatePerformanceForm({
        startsAt: "2099-09-01T19:00",
        bookingOpensAt: "2099-09-02T19:00",
      }),
    ).toEqual({
      bookingOpensAt: "예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.",
    });
  });

  it("유효한 시간 범위는 오류가 없다", () => {
    expect(
      validatePerformanceForm({
        startsAt: "2099-09-01T19:00",
        bookingOpensAt: "2099-08-30T19:00",
      }),
    ).toEqual({});
  });
});
