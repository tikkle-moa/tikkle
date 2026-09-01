import { fireEvent, render, screen } from "@testing-library/react";

import VenueFormNumberInput from "@features/venue-form/ui/VenueFormNumberInput";
import VenueFormTextInput from "@features/venue-form/ui/VenueFormTextInput";
import VenueFormTextarea from "@features/venue-form/ui/VenueFormTextarea";

describe("venue form fields", () => {
  it("텍스트 입력값, 글자 수, 필수 표시와 오류를 제공한다", () => {
    const onChange = vi.fn();
    render(
      <VenueFormTextInput
        id="name"
        label="이름"
        value="공연장"
        maxLength={100}
        error="이름 오류"
        placeholder="입력"
        required
        disabled
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText(/이름/);
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-describedby", "name-error");
    expect(screen.getByText("3/100")).toBeInTheDocument();
    expect(screen.getByText("이름 오류")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "새 이름" } });
    expect(onChange).toHaveBeenCalledWith("새 이름");
  });

  it("선택 속성 없이 텍스트 입력을 렌더링한다", () => {
    render(<VenueFormTextInput id="address" label="주소" value="" disabled={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText("주소")).toHaveAttribute("aria-invalid", "false");
  });

  it("숫자 입력은 최소·최대 범위와 숫자가 아닌 값을 무시한다", () => {
    const onChange = vi.fn();
    render(
      <VenueFormNumberInput id="number" label="숫자" value={5} min={1} max={10} error="숫자 오류" required disabled={false} onChange={onChange} />,
    );
    const input = screen.getByLabelText(/숫자/);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.change(input, { target: { value: "11" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
    expect(screen.getByText("숫자 오류")).toBeInTheDocument();
  });

  it("최대값이 null이면 상한 없이 숫자를 전달한다", () => {
    const onChange = vi.fn();
    render(<VenueFormNumberInput id="unlimited" label="무제한" value={1} max={null} disabled onChange={onChange} />);
    const input = screen.getByLabelText("무제한");
    expect(input).not.toHaveAttribute("max");
    fireEvent.change(input, { target: { value: "10000000" } });
    expect(onChange).toHaveBeenCalledWith(10_000_000);
  });

  it("설명 입력값과 오류 및 글자 수를 표시한다", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <VenueFormTextarea
        id="description"
        label="설명"
        value={null}
        maxLength={100}
        error="설명 오류"
        placeholder="설명 입력"
        required
        disabled
        onChange={onChange}
      />,
    );
    expect(screen.getByText("0/100")).toBeInTheDocument();
    expect(screen.getByText("설명 오류")).toBeInTheDocument();
    const textarea = screen.getByLabelText(/설명/);
    fireEvent.change(textarea, { target: { value: "내용" } });
    expect(onChange).toHaveBeenCalledWith("내용");

    rerender(<VenueFormTextarea id="description" label="설명" value="내용" disabled={false} onChange={onChange} />);
    expect(screen.getByDisplayValue("내용")).toHaveAttribute("aria-invalid", "false");
  });
});
