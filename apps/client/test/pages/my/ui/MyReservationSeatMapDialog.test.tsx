import type { ComponentProps } from "react";

import { fireEvent, render, screen } from "@testing-library/react";

import type { VenueDetailResponse } from "@entities/venue";

import MyReservationSeatMapDialog from "@pages/my/ui/MyReservationSeatMapDialog";

vi.mock("@features/venue-map", () => ({
  VenueMap: ({ selectedSeatIds, mutedSeatColors }: { selectedSeatIds: ReadonlySet<number>; mutedSeatColors?: boolean }) => (
    <div data-testid="venue-map" data-selected-seat-ids={[...selectedSeatIds].join(",")} data-muted-seat-colors={mutedSeatColors} />
  ),
}));

const venueDetail = {
  venue: {
    id: 7,
    name: "티클 아레나",
    address: "서울",
    description: null,
    width: 100,
    height: 80,
    stagePositionX: 50,
    stagePositionY: 10,
    stageWidth: 40,
    stageHeight: 8,
    createdAt: "2026-09-30T12:00:00",
  },
  venueSeats: [],
} satisfies VenueDetailResponse;

const renderDialog = (props: Partial<ComponentProps<typeof MyReservationSeatMapDialog>> = {}) => {
  const onClose = vi.fn();

  const view = render(
    <MyReservationSeatMapDialog
      matchingConcertCount={1}
      isPending={false}
      isError={false}
      venueDetail={venueDetail}
      selectedSeatIds={new Set([701])}
      reservationSeatCount={1}
      onClose={onClose}
      {...props}
    />,
  );

  return { onClose, ...view };
};

describe("MyReservationSeatMapDialog", () => {
  it("좌석 배치도를 불러오는 동안 로딩을 표시한다", () => {
    renderDialog({ isPending: true, venueDetail: undefined });

    expect(screen.getByRole("status")).toHaveTextContent("좌석 배치도를 불러오는 중입니다.");
  });

  it("좌석 배치도 조회 오류를 표시한다", () => {
    renderDialog({ isError: true, venueDetail: undefined });

    expect(screen.getByRole("alert")).toHaveTextContent("좌석 배치도를 불러오지 못했습니다.");
  });

  it("일치하는 콘서트가 없거나 여러 개면 배치도를 표시하지 않는다", () => {
    const missing = renderDialog({ matchingConcertCount: 0, venueDetail: undefined });
    expect(screen.getByRole("alert")).toHaveTextContent("공연장 좌석 배치 정보를 찾을 수 없습니다.");
    missing.unmount();

    renderDialog({ matchingConcertCount: 2, venueDetail: undefined });
    expect(screen.getByRole("alert")).toHaveTextContent("좌석 배치도를 확인할 수 없습니다.");
    expect(screen.queryByTestId("venue-map")).not.toBeInTheDocument();
  });

  it("예매 좌석 ID를 VenueMap에 넘겨 위치를 강조한다", () => {
    renderDialog();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const map = screen.getByTestId("venue-map");
    expect(map).toHaveAttribute("data-selected-seat-ids", "701");
    expect(map).toHaveAttribute("data-muted-seat-colors", "true");
  });

  it("배치도에서 찾지 못한 좌석과 빈 좌석 목록을 안내한다", () => {
    const unmatched = renderDialog({ selectedSeatIds: new Set(), reservationSeatCount: 1 });
    expect(screen.getByRole("alert")).toHaveTextContent("예매 좌석을 배치도에서 찾지 못했습니다.");
    unmatched.unmount();

    renderDialog({ selectedSeatIds: new Set(), reservationSeatCount: 0 });
    expect(screen.getByRole("status")).toHaveTextContent("예매된 좌석 정보가 없습니다.");
  });

  it("일부 좌석만 배치도와 일치하면 부분 안내를 표시한다", () => {
    renderDialog({ selectedSeatIds: new Set([701]), reservationSeatCount: 2 });

    expect(screen.getByRole("alert")).toHaveTextContent("일부 예매 좌석만 배치도에 표시할 수 있습니다.");
  });

  it("내용 클릭은 유지하고 닫기 버튼, 딤, Escape는 닫기 동작을 전달한다", () => {
    const { onClose } = renderDialog();
    const dialog = screen.getByRole("dialog", { name: "예매 좌석 보기" });

    fireEvent.click(screen.getByRole("heading", { name: "예매 좌석 보기" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledOnce();

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
