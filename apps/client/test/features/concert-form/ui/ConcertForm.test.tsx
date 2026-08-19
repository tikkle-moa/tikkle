import { fireEvent, render, screen } from "@testing-library/react";
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

  it("취소 버튼을 실행하고 제출 중에는 모든 컨트롤을 비활성화한다", async () => {
    const onCancel = vi.fn();
    render(<ConcertForm mode="create" isSubmitting onCancel={onCancel} onSubmit={vi.fn()} />);

    const cancelButton = screen.getByRole("button", { name: "취소" });
    expect(screen.getByRole("button", { name: "저장 중..." })).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /콘서트 제목/ })).toBeDisabled();

    // disabled 버튼은 클릭 핸들러를 실행하지 않는다.
    await userEvent.click(cancelButton);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("활성화된 취소 버튼을 누르면 onCancel을 호출한다", async () => {
    const onCancel = vi.fn();
    render(<ConcertForm mode="create" onCancel={onCancel} onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("설명을 입력하면 값과 글자 수를 갱신해 제출한다", async () => {
    const onSubmit = vi.fn();
    render(<ConcertForm mode="edit" initialValues={{ title: "공연", genre: "INDIE", placeName: "공연장" }} onSubmit={onSubmit} />);

    const description = screen.getByRole("textbox", { name: /콘서트 설명/ });
    await userEvent.type(description, "상세 설명");
    expect(screen.getByText("5/10,000")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "변경사항 저장" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "상세 설명" }));
  });

  it("포스터 이미지 로드 실패를 제출 시 오류로 표시하고 URL 수정 시 오류를 해제한다", async () => {
    render(
      <ConcertForm
        mode="create"
        initialValues={{ title: "공연", genre: "INDIE", placeName: "공연장", posterUrl: "https://example.com/missing.jpg" }}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "공연" }));
    await userEvent.click(screen.getByRole("button", { name: "콘서트 등록" }));
    expect(screen.getByText("포스터를 불러오는 데 실패했습니다.")).toBeInTheDocument();

    const posterUrl = screen.getByRole("textbox", { name: /포스터 URL/ });
    await userEvent.clear(posterUrl);
    expect(screen.queryByText("포스터를 불러오는 데 실패했습니다.")).not.toBeInTheDocument();
  });
});
