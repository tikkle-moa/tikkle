import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConcertForm } from "@features/concert-form";

describe("ConcertForm", () => {
  it("생성 모드의 모든 입력 필드를 렌더링한다", () => {
    render(<ConcertForm mode="create" onSubmit={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: /콘서트 제목/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /장르/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /공연 장소/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /포스터 URL/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /콘서트 설명/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "콘서트 등록" })).toBeInTheDocument();
  });

  it("필수값이 비어 있으면 오류를 표시하고 제출하지 않는다", async () => {
    const onSubmit = vi.fn();
    render(<ConcertForm mode="create" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "콘서트 등록" }));

    expect(await screen.findByText("콘서트 제목을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("장르를 선택해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("공연 장소를 입력해 주세요.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("유효한 값을 API 요청 형태로 제출한다", async () => {
    const onSubmit = vi.fn();
    render(<ConcertForm mode="create" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole("textbox", { name: /콘서트 제목/ }), "  Tikkle Live  ");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /장르/ }), "INDIE");
    await userEvent.type(screen.getByRole("textbox", { name: /공연 장소/ }), "블루스퀘어");
    await userEvent.type(screen.getByRole("textbox", { name: /포스터 URL/ }), "https://example.com/poster.jpg");
    await userEvent.click(screen.getByRole("button", { name: "콘서트 등록" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Tikkle Live",
      genre: "INDIE",
      placeName: "블루스퀘어",
      posterUrl: "https://example.com/poster.jpg",
      description: null,
    });
  });

  it("수정 모드에서 초깃값과 서버 오류를 표시한다", () => {
    render(
      <ConcertForm
        initialValues={{ title: "기존 콘서트", genre: "BALLAD", placeName: "KSPO DOME" }}
        mode="edit"
        onSubmit={vi.fn()}
        submitError="콘서트를 수정하지 못했습니다."
      />,
    );

    expect(screen.getByRole("textbox", { name: /콘서트 제목/ })).toHaveValue("기존 콘서트");
    expect(screen.getByRole("combobox", { name: /장르/ })).toHaveValue("BALLAD");
    expect(screen.getByRole("alert")).toHaveTextContent("콘서트를 수정하지 못했습니다.");
    expect(screen.getByRole("button", { name: "변경사항 저장" })).toBeInTheDocument();
  });
});
