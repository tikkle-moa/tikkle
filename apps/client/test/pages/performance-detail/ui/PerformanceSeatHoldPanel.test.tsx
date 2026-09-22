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

const renderPanel = ({ onCheckout = vi.fn(), onHoldSeatToggle = vi.fn(), selectedSeatIds = new Set<number>() } = {}) =>
  render(
    <MemoryRouter>
      <PerformanceSeatHoldPanel
        performanceId={1}
        venueSeats={[seat]}
        venueSeatStates={new Map()}
        selectedSeatIds={selectedSeatIds}
        seatOperationState={{ status: "idle" }}
        setVenueSeatStates={vi.fn()}
        setSelectedSeatIds={vi.fn()}
        onHoldSeatToggle={onHoldSeatToggle}
        setServerTimeOffset={vi.fn()}
        setSeatOperationState={vi.fn()}
        onCheckout={onCheckout}
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

  it("내 점유 좌석과 예매 정보 확인 CTA를 표시한다", () => {
    const onCheckout = vi.fn();
    const expiresAt = new Date("2026-09-16T20:00:00");
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      myGroupHeldSeatInfoBySeatId: new Map([[1, { groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt }]]),
      myGroupHolds: [{ groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt, venueSeatIds: [1] }],
      myGroupHeldSeatTotalPrice: 15000,
    });
    renderPanel({ onCheckout });

    expect(screen.getByRole("region", { name: "내 점유 좌석" })).toHaveTextContent("A구역 1번");
    expect(screen.getByRole("button", { name: /예매 정보 확인하기/ })).toBeInTheDocument();

    return userEvent
      .setup()
      .click(screen.getByRole("button", { name: /예매 정보 확인하기/ }))
      .then(() => {
        expect(onCheckout).toHaveBeenCalledWith({
          groupId: "group-1",
          holdId: "hold-1",
          performanceId: 1,
          venueSeatIds: [1],
          expiresAt: expiresAt.toISOString(),
        });
      });
  });

  it("checkout 콜백이 없어도 예매 정보 확인 CTA를 안전하게 무시한다", async () => {
    const user = userEvent.setup();
    const expiresAt = new Date("2026-09-16T20:00:00");
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      myGroupHeldSeatInfoBySeatId: new Map([[1, { groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt }]]),
      myGroupHolds: [{ groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt, venueSeatIds: [1] }],
    });
    renderPanel({ onCheckout: null as never });

    await user.click(screen.getByRole("button", { name: /예매 정보 확인하기/ }));

    expect(screen.getByRole("button", { name: /예매 정보 확인하기/ })).toBeInTheDocument();
  });

  it("지도에서 선택한 내 점유 좌석 행을 표시한다", () => {
    const expiresAt = new Date("2026-09-16T20:00:00");
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      myGroupHeldSeatInfoBySeatId: new Map([[1, { groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt }]]),
      myGroupHolds: [{ groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt, venueSeatIds: [1] }],
    });

    renderPanel({ selectedSeatIds: new Set([1]) });

    const selectedHold = screen.getByText("A구역 1번").closest("[data-selected]");
    expect(selectedHold).toHaveAttribute("data-selected", "true");
    expect(screen.getByText("1석 선택됨")).toBeInTheDocument();
  });

  it("내 점유 좌석 행을 선택하면 지도 좌석 토글을 요청한다", async () => {
    const user = userEvent.setup();
    const expiresAt = new Date("2026-09-16T20:00:00");
    const onHoldSeatToggle = vi.fn();
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      myGroupHeldSeatInfoBySeatId: new Map([[1, { groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt }]]),
      myGroupHolds: [{ groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt, venueSeatIds: [1] }],
    });

    renderPanel({ onHoldSeatToggle });

    await user.click(screen.getByRole("button", { name: "A구역 1번 선택" }));
    expect(onHoldSeatToggle).toHaveBeenCalledWith([1]);
  });

  it("내 점유 내역이 많으면 목록을 펼치고 접는다", async () => {
    const user = userEvent.setup();
    mockUsePerformanceSeatHoldPanel.mockReturnValue({
      ...createPanelState(),
      myGroupHeldSeatInfoBySeatId: new Map([[1, { groupId: "group-1", holdId: "hold-1", performanceId: 1, expiresAt: new Date() }]]),
      myGroupHolds: Array.from({ length: 6 }, (_, index) => ({
        groupId: "group-1",
        holdId: `hold-${index + 1}`,
        performanceId: 1,
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
          onHoldSeatToggle={vi.fn()}
          setServerTimeOffset={vi.fn()}
          setSeatOperationState={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("점유 해제 실패");
  });
});
