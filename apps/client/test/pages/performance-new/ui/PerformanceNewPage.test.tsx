import { fireEvent, render, screen } from "@testing-library/react";

import PerformanceNewPage from "@pages/performance-new/ui/PerformanceNewPage";

const {
  mockUsePerformanceNew,
  mockRefetch,
  mockHandleEditOpen,
  mockHandleEditCancel,
  mockHandleCreateOpen,
  mockHandleCreateClose,
  mockHandleDelete,
  mockHandleComplete,
} = vi.hoisted(() => ({
  mockUsePerformanceNew: vi.fn(),
  mockRefetch: vi.fn().mockResolvedValue(undefined),
  mockHandleEditOpen: vi.fn(),
  mockHandleEditCancel: vi.fn(),
  mockHandleCreateOpen: vi.fn(),
  mockHandleCreateClose: vi.fn(),
  mockHandleDelete: vi.fn(),
  mockHandleComplete: vi.fn(),
}));

vi.mock("@pages/performance-new/model/use-performance-new", () => ({
  usePerformanceNew: mockUsePerformanceNew,
}));

vi.mock("@features/concert-manage", () => ({
  ConcertManageIntro: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@features/performance-form", () => ({
  PerformanceForm: ({
    performanceId,
    submitLabel,
    onCancel,
    onSuccess,
  }: {
    performanceId?: number;
    submitLabel: string;
    onCancel: () => void;
    onSuccess: () => void;
  }) => (
    <div data-performance-id={performanceId} data-testid="performance-form">
      {submitLabel}
      <button onClick={onCancel} type="button">
        폼 취소
      </button>
      <button onClick={onSuccess} type="button">
        폼 저장 완료
      </button>
    </div>
  ),
  toPerformanceFormValues: vi.fn(),
}));

vi.mock("@pages/performance-new/ui/PerformanceNewMessage", () => ({
  default: ({ title, description }: { title: string; description: string }) => (
    <output data-testid="performance-new-message">
      {title} {description}
    </output>
  ),
}));

vi.mock("@pages/performance-new/ui/PerformanceNewSkeleton", () => ({
  default: () => <output data-testid="performance-new-skeleton" />,
}));

const defaultState = {
  concertId: 7,
  concert: {
    id: 7,
    title: "테스트 콘서트",
  },
  performances: [
    {
      id: 1,
      concertId: 7,
      startsAt: "2099-09-01T19:00:00",
      bookingOpensAt: null,
      createdAt: "2099-08-01T12:00:00",
    },
  ],
  isParamValid: true,
  isPending: false,
  isError: false,
  refetch: mockRefetch,
  editingPerformanceIds: new Set<number>(),
  isCreateOpen: false,
  deletingPerformanceIds: new Set<number>(),
  handleEditOpen: mockHandleEditOpen,
  handleEditCancel: mockHandleEditCancel,
  handleCreateOpen: mockHandleCreateOpen,
  handleCreateClose: mockHandleCreateClose,
  handleDelete: mockHandleDelete,
  handleComplete: mockHandleComplete,
};

describe("PerformanceNewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePerformanceNew.mockReturnValue(defaultState);
  });

  it("예매 시작 시각이 있으면 해당 시각을 표시한다", () => {
    const bookingOpensAt = "2099-08-30T19:00:00";

    mockUsePerformanceNew.mockReturnValue({
      ...defaultState,
      performances: [
        {
          ...defaultState.performances[0],
          bookingOpensAt,
        },
      ],
    });

    render(<PerformanceNewPage />);

    expect(screen.getByText(`예매 시작 · ${new Date(bookingOpensAt).toLocaleString()}`)).toBeInTheDocument();
  });

  it("잘못된 콘서트 ID면 안내 메시지를 표시한다", () => {
    mockUsePerformanceNew.mockReturnValue({
      ...defaultState,
      concert: undefined,
      isParamValid: false,
    });

    render(<PerformanceNewPage />);

    expect(screen.getByTestId("performance-new-message")).toHaveTextContent("잘못된 콘서트입니다. 올바른 콘서트에서 공연 회차를 등록해 주세요.");
  });

  it("콘서트 상세 조회 중에는 스켈레톤을 표시한다", () => {
    mockUsePerformanceNew.mockReturnValue({
      ...defaultState,
      concert: undefined,
      isPending: true,
    });

    render(<PerformanceNewPage />);

    expect(screen.getByTestId("performance-new-skeleton")).toBeInTheDocument();
  });

  it("콘서트 상세 조회에 실패하면 안내 메시지를 표시한다", () => {
    mockUsePerformanceNew.mockReturnValue({
      ...defaultState,
      concert: undefined,
      isError: true,
    });

    render(<PerformanceNewPage />);

    expect(screen.getByTestId("performance-new-message")).toHaveTextContent("콘서트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("기본으로는 생성 폼 없이 회차 목록과 추가 버튼을 표시한다", () => {
    render(<PerformanceNewPage />);

    expect(screen.getByRole("heading", { name: "공연 회차 등록" })).toBeInTheDocument();
    expect(screen.getByText("총 1개의 공연 일정")).toBeInTheDocument();
    expect(screen.queryByTestId("performance-form")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "공연 회차 추가" }));

    expect(mockHandleCreateOpen).toHaveBeenCalledOnce();
  });

  it("생성 중이면 등록 폼을 표시한다", () => {
    mockUsePerformanceNew.mockReturnValue({
      ...defaultState,
      isCreateOpen: true,
    });

    render(<PerformanceNewPage />);

    expect(screen.getByTestId("performance-form")).toHaveTextContent("등록");
  });

  it("회차별 수정과 삭제 핸들러를 호출한다", () => {
    render(<PerformanceNewPage />);

    fireEvent.click(screen.getByRole("button", { name: "공연 회차 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "공연 회차 삭제" }));

    expect(mockHandleEditOpen).toHaveBeenCalledWith(1);
    expect(mockHandleDelete).toHaveBeenCalledWith(1);
  });

  it("편집 중인 회차에는 수정 폼을 표시한다", () => {
    mockUsePerformanceNew.mockReturnValue({
      ...defaultState,
      editingPerformanceIds: new Set([1]),
    });

    render(<PerformanceNewPage />);

    fireEvent.click(screen.getByRole("button", { name: "폼 취소" }));
    fireEvent.click(screen.getByRole("button", { name: "폼 저장 완료" }));

    expect(mockHandleEditCancel).toHaveBeenNthCalledWith(1, 1);
    expect(mockHandleEditCancel).toHaveBeenNthCalledWith(2, 1);
    expect(screen.getByTestId("performance-form")).toHaveAttribute("data-performance-id", "1");
    expect(screen.getByTestId("performance-form")).toHaveTextContent("저장");
  });

  it("완료하면 상세 페이지 이동 콜백을 호출한다", () => {
    render(<PerformanceNewPage />);

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(mockHandleComplete).toHaveBeenCalledOnce();
  });
});
