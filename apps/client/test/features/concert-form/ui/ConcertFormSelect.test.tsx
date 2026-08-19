import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ConcertFormSelect from "@features/concert-form/ui/ConcertFormSelect";

const options = [
  { label: "발라드", value: "BALLAD" },
  { label: "인디", value: "INDIE" },
];

describe("ConcertFormSelect", () => {
  it("옵션을 표시하고 선택값을 갱신한다", async () => {
    const updateField = vi.fn();
    render(<ConcertFormSelect field="genre" label="장르" isSubmitting={false} value={null} options={options} updateField={updateField} />);

    const select = screen.getByRole("combobox", { name: "장르" });
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "장르를 선택해 주세요" })).toBeDisabled();
    await userEvent.selectOptions(select, "INDIE");
    expect(updateField).toHaveBeenCalledWith("genre", "INDIE");
  });

  it("필수 표시와 오류 접근성 정보를 표시하고 제출 중에는 비활성화한다", () => {
    render(
      <ConcertFormSelect field="genre" label="장르" isSubmitting value="BALLAD" options={options} error="장르 오류" updateField={vi.fn()} required />,
    );

    const select = screen.getByRole("combobox", { name: /장르/ });
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-describedby", "genre-error");
    expect(screen.getByText("장르 오류")).toBeInTheDocument();
    expect(screen.getByText("장르", { selector: "label" })).toHaveTextContent("*");
  });
});
