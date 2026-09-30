import { fireEvent, render, screen } from "@testing-library/react";

import type { CreateVenueRequest } from "@entities/venue";

import type { VenueFormSeat } from "@features/venue-form/model/venue-form.types";
import VenueLayoutEditor from "@features/venue-form/ui/VenueLayoutEditor";

const mocks = vi.hoisted(() => ({
  applyZoom: vi.fn(),
  resetView: vi.fn(),
  handleKeyDown: vi.fn(),
  handlePointerMove: vi.fn(),
  startStageDrag: vi.fn(),
  handlePointerDown: vi.fn(),
  startSelectedAreaDrag: vi.fn(),
  startBackgroundDrag: vi.fn(),
  finishDrag: vi.fn(),
  interaction: {
    svgRef: { current: null },
    dragState: null as null | { type: string; startX?: number; startY?: number; currentX?: number; currentY?: number },
    zoom: 1,
    pan: { x: 0, y: 0 },
    isAltPressed: false,
    maxZoom: 10,
    viewWidth: 100,
    viewHeight: 62.5,
  },
}));

vi.mock("@features/venue-form/model/use-venue-layout-interaction", () => ({
  useVenueLayoutInteraction: () => ({
    ...mocks.interaction,
    applyZoom: mocks.applyZoom,
    resetView: mocks.resetView,
    handleKeyDown: mocks.handleKeyDown,
    handlePointerMove: mocks.handlePointerMove,
    startStageDrag: mocks.startStageDrag,
    handlePointerDown: mocks.handlePointerDown,
    startSelectedAreaDrag: mocks.startSelectedAreaDrag,
    startBackgroundDrag: mocks.startBackgroundDrag,
    finishDrag: mocks.finishDrag,
  }),
}));

vi.mock("@features/venue-form/model/use-venue-layout-selection", () => ({
  useVenueLayoutSelection: ({ selectedSeatClientIds }: { selectedSeatClientIds: number[] }) => ({
    sectionNames: ["A", "미지정"],
    selectedSeatClientIdSet: new Set(selectedSeatClientIds),
    selectedBounds: selectedSeatClientIds.length ? { left: 10, right: 30, top: 20, bottom: 40 } : null,
  }),
}));

const venue: CreateVenueRequest = {
  name: "공연장",
  address: "주소",
  description: null,
  width: 100,
  height: 80,
  stagePositionX: 50,
  stagePositionY: 10,
  stageWidth: 40,
  stageHeight: 10,
};
const venueSeats: VenueFormSeat[] = [
  { clientId: 1, sectionName: "A", seatNumber: 1, seatLabel: "A1", price: 1, positionX: 20, positionY: 30 },
  { clientId: 2, sectionName: "", seatNumber: 2, seatLabel: "", price: 1, positionX: 40, positionY: 30 },
];

const props = {
  venue,
  venueSeats,
  selectedSeatClientIds: [] as number[],
  errorSeatClientIds: new Set([2]),
  collisionMapRef: { current: new Map<number, Set<number>>() },
  isSubmitting: false,
  setVenue: vi.fn(),
  setVenueSeats: vi.fn(),
  setErrors: vi.fn(),
  setSelectedSeatClientIds: vi.fn(),
  onLayoutChangeStart: vi.fn(),
};

describe("VenueLayoutEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mocks.interaction, { dragState: null, zoom: 1, pan: { x: 0, y: 0 }, isAltPressed: false, maxZoom: 10 });
  });

  it("무대, 좌석, 범례를 렌더링하고 확대 및 포인터 이벤트를 전달한다", () => {
    mocks.interaction.zoom = 2;
    const { container } = render(<VenueLayoutEditor {...props} selectedSeatClientIds={[1, 2]} />);
    expect(screen.getByText("STAGE")).toBeInTheDocument();
    expect(screen.getByText("2개 함께 이동")).toBeInTheDocument();
    expect(screen.getByText("미지정")).toBeInTheDocument();
    expect(container.querySelector("title")?.textContent).toContain("A1");

    fireEvent.click(screen.getByRole("button", { name: "확대" }));
    fireEvent.click(screen.getByRole("button", { name: "축소" }));
    expect(mocks.applyZoom).toHaveBeenCalledTimes(2);
    const svg = screen.getByRole("img");
    fireEvent.keyDown(svg, { key: "+" });
    fireEvent.pointerMove(svg);
    fireEvent.pointerUp(svg);
    fireEvent.pointerCancel(svg);
    expect(mocks.handleKeyDown).toHaveBeenCalled();
    expect(mocks.handlePointerMove).toHaveBeenCalled();
    expect(mocks.finishDrag).toHaveBeenCalledTimes(2);

    const groups = container.querySelectorAll("g");
    fireEvent.pointerDown(groups[0]);
    fireEvent.pointerDown(groups[1]);
    expect(mocks.startStageDrag).toHaveBeenCalled();
    expect(mocks.handlePointerDown).toHaveBeenCalled();
  });

  it("확대, 선택 드래그, Alt와 제출 중 상태를 표시한다", () => {
    Object.assign(mocks.interaction, {
      dragState: { type: "select", startX: 10, startY: 20, currentX: 30, currentY: 40 },
      zoom: 2,
      pan: { x: 5, y: 6 },
      isAltPressed: true,
      maxZoom: 2,
    });
    const { container, rerender } = render(<VenueLayoutEditor {...props} selectedSeatClientIds={[1]} />);
    expect(screen.getByText("200%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "확대" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "화면 초기화" }));
    expect(mocks.resetView).toHaveBeenCalled();
    const rects = container.querySelectorAll("svg > rect");
    fireEvent.pointerDown(rects[0]);
    fireEvent.pointerDown(rects[1]);
    expect(mocks.startBackgroundDrag).toHaveBeenCalled();
    expect(mocks.startSelectedAreaDrag).toHaveBeenCalled();

    rerender(<VenueLayoutEditor {...props} isSubmitting selectedSeatClientIds={[]} />);
    expect(screen.getByRole("button", { name: "축소" })).toBeDisabled();
    expect(screen.getByRole("img")).toHaveClass("cursor-not-allowed");
  });

  it("화면 이동 중에는 잡는 커서를 표시한다", () => {
    mocks.interaction.dragState = { type: "pan" };
    render(<VenueLayoutEditor {...props} />);
    expect(screen.getByRole("img")).toHaveClass("cursor-grabbing");
  });
});
