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
