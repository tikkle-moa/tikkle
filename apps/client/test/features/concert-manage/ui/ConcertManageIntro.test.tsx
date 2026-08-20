import { render, screen } from "@testing-library/react";
import { PencilLine } from "lucide-react";

import { ConcertManageIntro } from "@features/concert-manage";

describe("ConcertManageIntro", () => {
  it("관리 페이지의 제목과 설명을 표시한다", () => {
    render(<ConcertManageIntro title="콘서트 수정" description="등록된 콘서트 정보를 수정해 주세요." Icon={PencilLine} />);

    expect(screen.getByText("콘서트 관리")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "콘서트 수정" })).toBeInTheDocument();
    expect(screen.getByText("등록된 콘서트 정보를 수정해 주세요.")).toBeInTheDocument();
  });

  it("전달된 아이콘을 장식 요소로 렌더링한다", () => {
    const { container } = render(<ConcertManageIntro title="콘서트 등록" description="새 콘서트를 등록해 주세요." Icon={PencilLine} />);

    expect(container.querySelector(".lucide-pencil-line")).toHaveAttribute("aria-hidden", "true");
  });
});
