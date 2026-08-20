import { CONCERT_FORM_LIMITS } from "@features/concert-form/model/concert-form.constants";
import { getInitialConcertFormValues, toConcertRequest, validateConcertForm } from "@features/concert-form/model/concert-form.utils";

describe("admin concert form utils", () => {
  it("빈 폼의 필수 입력값을 검증한다", () => {
    const errors = validateConcertForm(getInitialConcertFormValues());

    expect(errors).toMatchObject({
      title: expect.any(String),
      genre: expect.any(String),
      placeName: expect.any(String),
    });
  });

  it("포스터 URL은 http 또는 https 주소만 허용한다", () => {
    const values = getInitialConcertFormValues({ title: "Tikkle Live", genre: "INDIE", placeName: "공연장", posterUrl: "javascript:alert(1)" });

    expect(validateConcertForm(values).posterUrl).toContain("http");
  });

  it("URL 형식이 아니거나 이미지 로드에 실패한 포스터를 검증한다", () => {
    const malformed = getInitialConcertFormValues({ title: "공연", genre: "INDIE", placeName: "공연장", posterUrl: "not a url" });
    const loadFailed = getInitialConcertFormValues({
      title: "공연",
      genre: "INDIE",
      placeName: "공연장",
      posterUrl: "https://example.com/missing.jpg",
    });

    expect(validateConcertForm(malformed).posterUrl).toContain("올바른 URL");
    expect(validateConcertForm(loadFailed, true).posterUrl).toBe("포스터를 불러오는 데 실패했습니다.");
  });

  it("각 텍스트 필드의 최대 길이를 검증한다", () => {
    const values = getInitialConcertFormValues({
      title: "가".repeat(CONCERT_FORM_LIMITS.title + 1),
      genre: "INDIE",
      placeName: "나".repeat(CONCERT_FORM_LIMITS.placeName + 1),
      posterUrl: `https://example.com/${"a".repeat(CONCERT_FORM_LIMITS.posterUrl)}`,
      description: "다".repeat(CONCERT_FORM_LIMITS.description + 1),
    });

    expect(validateConcertForm(values)).toMatchObject({
      title: expect.stringContaining(`${CONCERT_FORM_LIMITS.title}자`),
      placeName: expect.stringContaining(`${CONCERT_FORM_LIMITS.placeName}자`),
      posterUrl: expect.stringContaining(`${CONCERT_FORM_LIMITS.posterUrl}자`),
      description: expect.stringContaining(CONCERT_FORM_LIMITS.description.toLocaleString()),
    });
  });

  it("유효한 http와 https URL은 허용한다", () => {
    const base = { title: "공연", genre: "INDIE" as const, placeName: "공연장" };

    expect(validateConcertForm(getInitialConcertFormValues({ ...base, posterUrl: "http://example.com/poster.jpg" })).posterUrl).toBeUndefined();
    expect(validateConcertForm(getInitialConcertFormValues({ ...base, posterUrl: "https://example.com/poster.jpg" })).posterUrl).toBeUndefined();
  });

  it("문자열을 정리하고 빈 선택값은 null로 변환한다", () => {
    const values = getInitialConcertFormValues({ title: "  Tikkle Live  ", genre: "INDIE", placeName: "  공연장 ", description: "  " });

    expect(toConcertRequest(values)).toEqual({
      title: "Tikkle Live",
      genre: "INDIE",
      placeName: "공연장",
      posterUrl: null,
      description: null,
    });
  });
});
