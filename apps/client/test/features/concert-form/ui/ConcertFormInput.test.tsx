import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConcertFormInput from "@features/concert-form/ui/ConcertFormInput";

describe("ConcertFormInput", () => {
  it("레이블, 값, 글자 수를 표시하고 입력값을 갱신한다", async () => {
    const updateField = vi.fn();
    render(
      <ConcertFormInput
        field="title"
        label="콘서트 제목"
        isSubmitting={false}
        value="공연"
        placeholder="제목을 입력하세요"
        updateField={updateField}
        required
      />,
    );

    const input = screen.getByRole("textbox", { name: /콘서트 제목/ });
    expect(input).toHaveValue("공연");
    expect(screen.getByText("2/100")).toBeInTheDocument();
    expect(screen.getByText("콘서트 제목", { selector: "label" })).toHaveTextContent("*");

    await userEvent.type(input, "장");
    expect(updateField).toHaveBeenLastCalledWith("title", "공연장");
  });

  it("오류 접근성 정보를 표시하고 제출 중에는 비활성화한다", () => {
    render(
      <ConcertFormInput
        field="posterUrl"
        label="포스터 URL"
        isSubmitting
        value={null}
        placeholder="URL을 입력하세요"
        error="URL 오류"
        updateField={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox", { name: "포스터 URL" });
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "posterUrl-error");
    expect(screen.getByText("URL 오류")).toBeInTheDocument();
    expect(screen.getByText("0/400")).toBeInTheDocument();
  });
});
