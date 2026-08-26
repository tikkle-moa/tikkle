import { fireEvent, render, screen } from "@testing-library/react";

import PerformanceNewPage from "@pages/performance-new/ui/PerformanceNewPage";

const { mockHandleComplete, mockUseConcertDetail, mockUsePerformanceNew } = vi.hoisted(() => ({
  mockHandleComplete: vi.fn(),
  mockUseConcertDetail: vi.fn(),
  mockUsePerformanceNew: vi.fn(),
}));

vi.mock("@entities/concert", () => ({
  useConcertDetail: mockUseConcertDetail,
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
    concertId,
    performances,
    defaultCreateOpen,
    onChanged,
    onComplete,
  }: {
    concertId: number;
    performances: unknown[];
    defaultCreateOpen: boolean;
    onChanged: () => Promise<unknown>;
    onComplete?: () => void;
  }) => (
    <div data-concert-id={concertId} data-create-open={defaultCreateOpen} data-performance-count={performances.length} data-testid="performance-form">
      <button onClick={onChanged} type="button">
        목록 갱신
      </button>

      <button onClick={onComplete} type="button">
        완료
      </button>
    </div>
  ),
}));

const defaultPerformanceNewState = {
  concertId: 7,
  isParamValid: true,
  handleComplete: mockHandleComplete,
};

const successDetailState = {
  data: {
    concert: {
      id: 7,
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
  },
  isError: false,
  isPending: false,
  refetch: vi.fn().mockResolvedValue(undefined),
};

describe("PerformanceNewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePerformanceNew.mockReturnValue(defaultPerformanceNewState);
    mockUseConcertDetail.mockReturnValue(successDetailState);
  });

  it("잘못된 콘서트 ID면 오류 상태를 표시한다", () => {
    mockUsePerformanceNew.mockReturnValue({
      ...defaultPerformanceNewState,
      concertId: Number.NaN,
      isParamValid: false,
    });

    render(<PerformanceNewPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("잘못된 콘서트입니다.");
  });

  it("콘서트 상세 조회 중에는 로딩 상태를 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
      refetch: vi.fn(),
    });

    render(<PerformanceNewPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("콘서트 정보를 불러오는 중입니다.")).toBeInTheDocument();
  });

  it("콘서트 상세 조회에 실패하면 오류 상태를 표시한다", () => {
    mockUseConcertDetail.mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
      refetch: vi.fn(),
    });

    render(<PerformanceNewPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("콘서트 정보를 불러오지 못했습니다.");
  });

  it("회차 관리 폼에 콘서트와 기존 회차를 전달한다", () => {
    render(<PerformanceNewPage />);

    expect(screen.getByRole("heading", { name: "공연 회차 등록" })).toBeInTheDocument();

    expect(screen.getByTestId("performance-form")).toHaveAttribute("data-concert-id", "7");
    expect(screen.getByTestId("performance-form")).toHaveAttribute("data-performance-count", "1");
    expect(screen.getByTestId("performance-form")).toHaveAttribute("data-create-open", "true");
  });

  it("회차 목록 변경 콜백으로 상세 쿼리를 다시 조회한다", () => {
    render(<PerformanceNewPage />);

    fireEvent.click(screen.getByRole("button", { name: "목록 갱신" }));

    expect(successDetailState.refetch).toHaveBeenCalledOnce();
  });

  it("완료하면 상세 페이지 이동 콜백을 호출한다", () => {
    render(<PerformanceNewPage />);

    fireEvent.click(screen.getByRole("button", { name: "완료" }));

    expect(mockHandleComplete).toHaveBeenCalledOnce();
  });
});
