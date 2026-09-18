import { createRef } from "react";

import { renderHook } from "@testing-library/react";

import type { VenueSeatResponse, VenueSeatState } from "@entities/venue";

import { useVenueMapSeatDomSync } from "@features/venue-map/model/use-venue-map-seat-dom-sync";

const seats = [
  { id: 1, seatLabel: "A-1", price: 10000 },
  { id: 2, seatLabel: "A-2", price: 10000 },
  { id: 3, seatLabel: "A-3", price: 10000 },
] as VenueSeatResponse[];

const createSeatElement = (id: string, withVisual = true) => {
  const container = document.createElementNS("http://www.w3.org/2000/svg", "g");
  container.dataset.seatId = id;
  if (withVisual) {
    const visual = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    visual.dataset.seatVisual = "true";
    container.append(visual);
  }
  return container;
};

describe("useVenueMapSeatDomSync", () => {
  it("상태가 없으면 label만 만들고 이후 상태와 visual을 증분 동기화한다", () => {
    const svgRef = createRef<SVGSVGElement>();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const first = createSeatElement("1");
    const second = createSeatElement("2", false);
    svg.append(first, second, createSeatElement("invalid"));
    svgRef.current = svg;

    const { result, rerender } = renderHook(
      ({ states, offset, holdMode }) =>
        useVenueMapSeatDomSync({
          svgRef,
          venueSeats: seats,
          venueSeatStates: states,
          serverTimeOffset: offset,
          isHoldMode: holdMode,
        }),
      {
        initialProps: {
          states: undefined as ReadonlyMap<number, VenueSeatState> | undefined,
          offset: 0,
          holdMode: true,
        },
      },
    );
    expect(result.current.get(1)).toBe("A-1, 10,000원");

    const booked = new Map<number, VenueSeatState>([
      [1, { status: "booked" }],
      [2, { status: "booked" }],
      [3, { status: "booked" }],
    ]);
    rerender({ states: booked, offset: 0, holdMode: true });

    expect(first).toHaveAttribute("data-seat-status", "booked");
    expect(first).toHaveAttribute("aria-disabled", "true");
    expect(first.querySelector("[data-seat-visual]")).toHaveAttribute("fill-opacity", "0.72");
    expect(second).toHaveClass("cursor-not-allowed");

    const held = new Map<number, VenueSeatState>([
      [1, { status: "held_by_my_group", expiresAt: new Date("2026-09-16T20:00:00") }],
      [2, { status: "held_by_other_group", expiresAt: new Date("2026-09-16T20:00:00") }],
    ]);
    rerender({ states: held, offset: 1000, holdMode: false });

    expect(first).not.toHaveAttribute("aria-disabled", "false");
    expect(first).toHaveClass("cursor-pointer");
    expect(first.querySelector("[data-seat-visual]")).toHaveClass("group-hover:brightness-95");
  });

  it("같은 비-Hold 상태에서 서버 시간만 바뀌면 DOM을 유지한다", () => {
    const svgRef = createRef<SVGSVGElement>();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const first = createSeatElement("1");
    svg.append(first);
    svgRef.current = svg;
    const states = new Map<number, VenueSeatState>([[1, { status: "available" }]]);
    const { rerender } = renderHook(
      ({ offset }) =>
        useVenueMapSeatDomSync({
          svgRef,
          venueSeats: seats.slice(0, 1),
          venueSeatStates: states,
          serverTimeOffset: offset,
          isHoldMode: true,
        }),
      { initialProps: { offset: 0 } },
    );

    first.setAttribute("aria-label", "unchanged");
    rerender({ offset: 1000 });
    expect(first).toHaveAttribute("aria-label", "unchanged");
  });
});
