import { formatDate, formatDateTime, toDate } from "@shared/lib/date.utils";

const DATE_TIME = "2026-09-01T19:00:00";

describe("date utils", () => {
  it("문자열을 Date 객체로 변환한다", () => {
    expect(toDate(DATE_TIME)).toEqual(new Date(DATE_TIME));
  });

  it("Date 객체는 그대로 반환한다", () => {
    const date = new Date(DATE_TIME);

    expect(toDate(date)).toBe(date);
  });

  it("날짜만 지역 형식으로 표시한다", () => {
    expect(formatDate(DATE_TIME)).toBe(new Date(DATE_TIME).toLocaleDateString());
  });

  it("날짜와 시간을 기본 형식으로 표시한다", () => {
    expect(formatDateTime(DATE_TIME)).toBe(
      new Date(DATE_TIME).toLocaleString(undefined, {
        dateStyle: "long",
        timeStyle: "short",
      }),
    );
  });

  it("전달한 날짜·시간 옵션으로 기본 형식을 재정의한다", () => {
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: "short",
      timeStyle: "medium",
    };

    expect(formatDateTime(DATE_TIME, options)).toBe(new Date(DATE_TIME).toLocaleString(undefined, options));
  });
});
