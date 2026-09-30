import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConcertFormTextarea from "@features/concert-form/ui/ConcertFormTextarea";

describe("ConcertFormTextarea", () => {
  it("값과 글자 수를 표시하고 입력값을 갱신한다", async () => {
    const updateField = vi.fn();
    render(
      <ConcertFormTextarea
        field="description"
        label="콘서트 설명"
        isSubmitting={false}
        value="설명"
        placeholder="설명을 입력하세요"
        updateField={updateField}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "콘서트 설명" });
    expect(textarea).toHaveValue("설명");
    expect(screen.getByText("2/10,000")).toBeInTheDocument();
    await userEvent.type(textarea, "추");
    expect(updateField).toHaveBeenCalledWith("description", "설명추");
  });

  it("필수 표시와 오류 접근성 정보를 표시하고 제출 중에는 비활성화한다", () => {
    render(
      <ConcertFormTextarea
        field="description"
        label="콘서트 설명"
        isSubmitting
        value={null}
        placeholder="설명을 입력하세요"
        error="설명 오류"
        updateField={vi.fn()}
        required
      />,
    );

    const textarea = screen.getByRole("textbox", { name: /콘서트 설명/ });
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", "description-error");
    expect(screen.getByText("설명 오류")).toBeInTheDocument();
    expect(screen.getByText("콘서트 설명", { selector: "label" })).toHaveTextContent("*");
    expect(screen.getByText("0/10,000")).toBeInTheDocument();
  });
});
