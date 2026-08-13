import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ButtonWrapper from "@shared/ui/ButtonWrapper";

describe("ButtonWrapper", () => {
  it("onClick이 있으면 button 엘리먼트를 렌더링한다", () => {
    render(<ButtonWrapper onClick={vi.fn()}>내용</ButtonWrapper>);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("onClick이 없으면 div 엘리먼트를 렌더링한다", () => {
    const { container } = render(<ButtonWrapper>내용</ButtonWrapper>);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  it('button 렌더링 시 type="button" 속성을 가진다', () => {
    render(<ButtonWrapper onClick={vi.fn()}>내용</ButtonWrapper>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("button 렌더링 시 buttonClassName을 적용한다", () => {
    render(
      <ButtonWrapper onClick={vi.fn()} buttonClassName="btn-class">
        내용
      </ButtonWrapper>,
    );

    expect(screen.getByRole("button")).toHaveClass("btn-class");
  });

  it("div 렌더링 시 className을 적용한다", () => {
    const { container } = render(<ButtonWrapper className="div-class">내용</ButtonWrapper>);

    expect(container.firstChild).toHaveClass("div-class");
  });

  it("클릭 시 onClick이 호출된다", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ButtonWrapper onClick={onClick}>내용</ButtonWrapper>);
    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("children을 렌더링한다", () => {
    render(<ButtonWrapper onClick={vi.fn()}>자식 요소</ButtonWrapper>);

    expect(screen.getByText("자식 요소")).toBeInTheDocument();
  });
});
