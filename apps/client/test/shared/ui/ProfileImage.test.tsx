import { render, screen } from "@testing-library/react";

import ProfileImage from "@shared/ui/ProfileImage";

describe("ProfileImage", () => {
  it("이미지 URL이 있으면 원형 프로필 이미지를 렌더링한다", () => {
    render(<ProfileImage alt="테스트 사용자 프로필 이미지" className="size-7" src="https://example.com/profile.png" />);

    expect(screen.getByRole("img", { name: "테스트 사용자 프로필 이미지" })).toHaveAttribute("src", "https://example.com/profile.png");
  });

  it("이미지 URL이 없으면 기본 프로필 아이콘을 렌더링한다", () => {
    const { container } = render(<ProfileImage alt="테스트 사용자 프로필 이미지" className="size-7" src={null} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
