import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SectionTitle from "@shared/ui/SectionTitle";

describe("SectionTitle", () => {
  it("제목을 렌더링한다", () => {
    render(<SectionTitle title="오픈 예정" />);
    expect(screen.getByRole("heading", { level: 2, name: "오픈 예정" })).toBeInTheDocument();
  });

  it("subtitle이 있으면 렌더링한다", () => {
    render(<SectionTitle title="오픈 예정" subtitle="지금 바로 알림 설정하세요" />);
    expect(screen.getByText("지금 바로 알림 설정하세요")).toBeInTheDocument();
  });

  it("subtitle이 없으면 렌더링하지 않는다", () => {
    render(<SectionTitle title="오픈 예정" />);
    expect(screen.queryByText(/지금/)).not.toBeInTheDocument();
  });

  it("onClickMore가 있으면 전체보기 버튼을 렌더링한다", () => {
    render(<SectionTitle title="오픈 예정" onClickMore={vi.fn()} />);
    expect(screen.getByRole("button", { name: "전체보기" })).toBeInTheDocument();
  });

  it("onClickMore가 없으면 전체보기 버튼을 렌더링하지 않는다", () => {
    render(<SectionTitle title="오픈 예정" />);
    expect(screen.queryByRole("button", { name: "전체보기" })).not.toBeInTheDocument();
  });

  it("전체보기 버튼 클릭 시 onClickMore를 호출한다", async () => {
    const onClickMore = vi.fn();
    render(<SectionTitle title="오픈 예정" onClickMore={onClickMore} />);
    await userEvent.click(screen.getByRole("button", { name: "전체보기" }));
    expect(onClickMore).toHaveBeenCalledTimes(1);
  });
});
