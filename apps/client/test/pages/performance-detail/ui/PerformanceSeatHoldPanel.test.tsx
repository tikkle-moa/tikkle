import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PerformanceSeatHoldPanel from "@pages/performance-detail/ui/PerformanceSeatHoldPanel";

const { mockUsePerformanceSeatHoldPanel } = vi.hoisted(() => ({
  mockUsePerformanceSeatHoldPanel: vi.fn(),
}));

vi.mock("@pages/performance-detail/model/use-performance-seat-hold-panel", () => ({
  usePerformanceSeatHoldPanel: mockUsePerformanceSeatHoldPanel,
}));

const seat = { id: 1, seatLabel: "A구역 1번", price: 15000 } as never;
const connectionStyle = {
  label: "실시간 연결됨",
  description: "좌석 상태가 동기화되었습니다.",
  className: "connected",
  dotClassName: "dot",
};

const createPanelState = () => ({
  isRefreshing: false,
  refreshError: null,
  myGroupHolds: [],
  myGroupHeldSeatInfoBySeatId: new Map(),
  selectedSeatIdsToRelease: [],
  myGroupHeldSeatTotalPrice: 0,
  venueSeatById: new Map([[1, seat]]),
  handleRefresh: vi.fn(),
  handleReleaseSeats: vi.fn(),
  visibleSeatOperationState: { status: "idle" as const },
  isConnected: true,
  connectionStyle,
});

const renderPanel = () =>
  render(
    <MemoryRouter>
      <PerformanceSeatHoldPanel
        performanceId={1}
        venueSeats={[seat]}
        venueSeatStates={new Map()}
        selectedSeatIds={new Set()}
        seatOperationState={{ status: "idle" }}
        setVenueSeatStates={vi.fn()}
        setSelectedSeatIds={vi.fn()}
        setServerTimeOffset={vi.fn()}
        setSeatOperationState={vi.fn()}
      />
    </MemoryRouter>,
  );

describe("PerformanceSeatHoldPanel", () => {
  beforeEach(() => {
    mockUsePerformanceSeatHoldPanel.mockReturnValue(createPanelState());
  });

  it("연결 상태와 점유 안내를 표시한다", () => {
    renderPanel();

    expect(screen.getByRole("status")).toHaveTextContent("실시간 연결됨");
    expect(screen.getByRole("region", { name: "좌석 점유 안내" })).toBeInTheDocument();
    expect(mockUsePerformanceSeatHoldPanel).toHaveBeenCalledWith(expect.objectContaining({ performanceId: 1, venueSeats: [seat] }));
  });

  it("선택한 내 점유 좌석을 해제한다", async () => {
    const user = userEvent.setup();
    const handleReleaseSeats = vi.fn();
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      selectedSeatIdsToRelease: [1],
      handleReleaseSeats,
    });
    renderPanel();

    await user.click(screen.getByRole("button", { name: "점유 해제 · 1석" }));
    expect(handleReleaseSeats).toHaveBeenCalledOnce();
  });

  it("내 점유 좌석과 결제 링크를 표시한다", () => {
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      myGroupHeldSeatInfoBySeatId: new Map([[1, { holdId: "hold-1", expiresAt: new Date() }]]),
      myGroupHolds: [{ holdId: "hold-1", expiresAt: new Date("2026-09-16T20:00:00"), venueSeatIds: [1] }],
      myGroupHeldSeatTotalPrice: 15000,
    });
    renderPanel();

    expect(screen.getByRole("region", { name: "내 점유 좌석" })).toHaveTextContent("A구역 1번");
    expect(screen.getByRole("link", { name: /결제하러 가기/ })).toHaveAttribute("href", "/payments/fixture/checkout");
  });

  it("내 점유 내역이 많으면 목록을 펼치고 접는다", async () => {
    const user = userEvent.setup();
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      myGroupHeldSeatInfoBySeatId: new Map([[1, { holdId: "hold-1", expiresAt: new Date() }]]),
      myGroupHolds: Array.from({ length: 6 }, (_, index) => ({
        holdId: `hold-${index + 1}`,
        expiresAt: new Date("2026-09-16T20:00:00"),
        venueSeatIds: [index === 5 ? 999 : 1],
      })),
    });
    renderPanel();

    const expandButton = screen.getByRole("button", { name: "더보기" });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");

    await user.click(expandButton);
    const collapseButton = screen.getByRole("button", { name: "접기" });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");

    await user.click(collapseButton);
    expect(screen.getByRole("button", { name: "더보기" })).toHaveAttribute("aria-expanded", "false");
  });

  it("Release 처리 중에는 버튼을 비활성화하고 오류 상태를 표시한다", () => {
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      selectedSeatIdsToRelease: [1],
      visibleSeatOperationState: { status: "loading" },
    });
    const { rerender } = renderPanel();
    expect(screen.getByRole("button", { name: "처리 중" })).toBeDisabled();

    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      selectedSeatIdsToRelease: [1],
      visibleSeatOperationState: { status: "error", message: "점유 해제 실패" },
    });
    rerender(
      <MemoryRouter>
        <PerformanceSeatHoldPanel
          performanceId={1}
          venueSeats={[seat]}
          venueSeatStates={new Map()}
          selectedSeatIds={new Set()}
          seatOperationState={{ status: "idle" }}
          setVenueSeatStates={vi.fn()}
          setSelectedSeatIds={vi.fn()}
          setServerTimeOffset={vi.fn()}
          setSeatOperationState={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("점유 해제 실패");
  });
});
