import { MemoryRouter } from "react-router";

import { fireEvent, render, screen } from "@testing-library/react";

import { formatDateTime } from "@shared/lib/date.utils";

import type { PerformanceResponse } from "@entities/performance";

import PerformanceBookingPanel from "@pages/concert-detail/ui/PerformanceBookingPanel";

const {
  mockHandleCreateClose,
  mockHandleCreateOpen,
  mockHandleDelete,
  mockHandleEditClose,
  mockHandleEditOpen,
  mockPerformanceForm,
  mockToPerformanceFormValues,
  mockUsePerformanceBookingPanel,
} = vi.hoisted(() => ({
  mockHandleCreateClose: vi.fn(),
  mockHandleCreateOpen: vi.fn(),
  mockHandleDelete: vi.fn(),
  mockHandleEditClose: vi.fn(),
  mockHandleEditOpen: vi.fn(),
  mockPerformanceForm: vi.fn(),
  mockToPerformanceFormValues: vi.fn(),
  mockUsePerformanceBookingPanel: vi.fn(),
}));

vi.mock("@features/performance-form", () => ({
  PerformanceForm: mockPerformanceForm,
  toPerformanceFormValues: mockToPerformanceFormValues,
}));

vi.mock("@pages/concert-detail/model/use-performance-booking-panel", () => ({
  usePerformanceBookingPanel: mockUsePerformanceBookingPanel,
}));

const makePerformance = (overrides: Partial<PerformanceResponse> = {}): PerformanceResponse => ({
  id: 1,
  concertId: 1,
  name: "Tikkle Live",
  startsAt: "2026-09-01T19:00:00",
  bookingOpensAt: null,
  createdAt: "2026-08-23T12:00:00",
  status: "AVAILABLE",
  ...overrides,
});

const onChanged = vi.fn().mockResolvedValue(undefined);

const renderPerformanceBookingPanel = ({
  concertId = 1,
  isAdmin = false,
  performances = [],
}: {
  concertId?: number;
  isAdmin?: boolean;
  performances?: PerformanceResponse[];
} = {}) =>
  render(
    <MemoryRouter>
      <PerformanceBookingPanel concertId={concertId} isAdmin={isAdmin} onChanged={onChanged} performances={performances} />
    </MemoryRouter>,
  );

describe("PerformanceBookingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockToPerformanceFormValues.mockImplementation((performance: PerformanceResponse) => ({
      name: performance.name,
      startsAt: performance.startsAt.slice(0, 16),
      bookingOpensAt: performance.bookingOpensAt?.slice(0, 16) ?? "",
    }));
    mockPerformanceForm.mockImplementation(({ performanceId, submitLabel }) => (
      <output data-testid="performance-form">
        {performanceId ?? "create"}:{submitLabel}
      </output>
    ));
    mockUsePerformanceBookingPanel.mockReturnValue({
      editingPerformanceIds: new Set(),
      isCreateOpen: false,
      deletingPerformanceIds: new Set(),
      handleEditOpen: mockHandleEditOpen,
      handleEditClose: mockHandleEditClose,
      handleCreateOpen: mockHandleCreateOpen,
      handleCreateClose: mockHandleCreateClose,
      handleDelete: mockHandleDelete,
    });
  });

  it("일반 사용자에게 빈 상태와 안내 문구를 표시한다", () => {
    renderPerformanceBookingPanel();

    expect(screen.getByRole("heading", { name: "공연 회차" })).toBeInTheDocument();
    expect(screen.getByText("총 0회")).toBeInTheDocument();
    expect(screen.getByText("등록된 공연 회차가 없습니다")).toBeInTheDocument();
    expect(screen.getByText("콘서트 정보는 계속 둘러볼 수 있습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("일반 사용자에게 회차 목록과 상세 이동 링크를 표시한다", () => {
    const firstPerformance = makePerformance({
      id: 1,
      name: "오픈 예정 공연",
      bookingOpensAt: "2026-08-30T14:00:00",
      status: "UPCOMING",
    });
    const secondPerformance = makePerformance({
      id: 2,
      name: "예매 중인 공연",
    });
    const endedPerformance = makePerformance({
      id: 3,
      name: "종료된 공연",
      startsAt: "2026-08-01T19:00:00",
      status: "ENDED",
    });

    renderPerformanceBookingPanel({
      performances: [firstPerformance, secondPerformance, endedPerformance],
    });

    expect(screen.getByRole("link", { name: "오픈 예정 공연 상세 보기" })).toHaveAttribute("href", "/performances/1");
    expect(screen.getByRole("link", { name: "예매 중인 공연 상세 보기" })).toHaveAttribute("href", "/performances/2");
    expect(screen.getByText("오픈 예정 공연")).toBeInTheDocument();
    expect(screen.getByText("예매 중인 공연")).toBeInTheDocument();
    expect(screen.getByText("오픈 예정")).toBeInTheDocument();
    expect(screen.getByText("예매 중")).toBeInTheDocument();
    expect(screen.getByText(`${formatDateTime(firstPerformance.bookingOpensAt!)} 오픈`)).toBeInTheDocument();
    expect(screen.getByText("종료된 공연").closest("div[aria-disabled='true']")).toHaveClass("cursor-not-allowed", "opacity-80");
    expect(screen.getByText("공연 종료")).toBeInTheDocument();
    expect(screen.getByText("총 3회")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "공연 회차 목록" })).toHaveClass("max-h-70", "overflow-y-auto");
    expect(screen.getByText("회차를 선택하면 상세 정보와 좌석 배치를 확인할 수 있습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "공연 회차 수정" })).not.toBeInTheDocument();
  });

  it("관리자는 빈 회차 목록에서도 추가 버튼을 표시한다", () => {
    renderPerformanceBookingPanel({
      isAdmin: true,
    });

    const addButton = screen.getByRole("button", { name: "공연 회차 추가" });

    expect(addButton).toBeInTheDocument();
    expect(addButton.parentElement).toHaveClass("px-5", "pb-5");
  });

  it("관리자에게 회차 추가와 행 수정·삭제 동작을 제공한다", () => {
    const performance = makePerformance();

    renderPerformanceBookingPanel({
      isAdmin: true,
      performances: [performance],
    });

    fireEvent.click(screen.getByRole("button", { name: "공연 회차 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "공연 회차 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "공연 회차 삭제" }));

    expect(mockHandleCreateOpen).toHaveBeenCalledOnce();
    expect(mockHandleEditOpen).toHaveBeenCalledWith(performance.id);
    expect(mockHandleDelete).toHaveBeenCalledWith(performance.id);
  });

  it("관리자가 수정하거나 생성 중이면 해당 행에 폼을 표시한다", async () => {
    const performance = makePerformance();

    mockUsePerformanceBookingPanel.mockReturnValue({
      editingPerformanceIds: new Set([performance.id]),
      isCreateOpen: true,
      deletingPerformanceIds: new Set(),
      handleEditOpen: mockHandleEditOpen,
      handleEditClose: mockHandleEditClose,
      handleCreateOpen: mockHandleCreateOpen,
      handleCreateClose: mockHandleCreateClose,
      handleDelete: mockHandleDelete,
    });

    renderPerformanceBookingPanel({
      concertId: 7,
      isAdmin: true,
      performances: [performance],
    });

    expect(screen.getAllByTestId("performance-form")).toHaveLength(2);
    expect(screen.getAllByTestId("performance-form")[0]).toHaveTextContent("1:저장");
    expect(screen.getAllByTestId("performance-form")[1]).toHaveTextContent("create:등록");

    const [editForm, createForm] = screen.getAllByTestId("performance-form");

    expect(editForm.closest("ul")).toBeInTheDocument();
    expect(createForm.closest("ul")).not.toBeInTheDocument();

    expect(mockToPerformanceFormValues).toHaveBeenCalledWith(performance);

    const editFormProps = mockPerformanceForm.mock.calls.find(([props]) => props.performanceId === performance.id)?.[0];
    const createFormProps = mockPerformanceForm.mock.calls.find(([props]) => props.performanceId === undefined)?.[0];

    expect(editFormProps).toBeDefined();
    expect(createFormProps).toBeDefined();

    editFormProps.onCancel();
    await editFormProps.onSaved();
    editFormProps.onSuccess();

    createFormProps.onCancel();
    await createFormProps.onSaved();
    createFormProps.onSuccess();

    expect(mockHandleEditClose).toHaveBeenCalledTimes(2);
    expect(mockHandleEditClose).toHaveBeenNthCalledWith(1, performance.id);
    expect(mockHandleEditClose).toHaveBeenNthCalledWith(2, performance.id);
    expect(mockHandleCreateClose).toHaveBeenCalledTimes(2);
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it("관리자는 종료 회차를 수정할 수 없다", () => {
    const endedPerformance = makePerformance({
      id: 3,
      name: "종료된 공연",
      startsAt: "2026-08-01T19:00:00",
      status: "ENDED",
    });

    renderPerformanceBookingPanel({
      isAdmin: true,
      performances: [endedPerformance],
    });

    expect(screen.queryByRole("button", { name: "공연 회차 수정" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "공연 회차 삭제" })).toBeInTheDocument();
  });
});
