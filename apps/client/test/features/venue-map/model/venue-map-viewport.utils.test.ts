import { VENUE_MAP_MIN_ZOOM } from "@features/venue-map/model/venue-map-viewport.constants";
import { clampViewport, createInitialViewport, getDistance, getMidpoint, zoomAt } from "@features/venue-map/model/venue-map-viewport.utils";

describe("venue map viewport utils", () => {
  it("공연장 크기의 중심을 초기 viewport로 생성한다", () => {
    expect(createInitialViewport({ width: 120, height: 80 })).toEqual({
      zoom: VENUE_MAP_MIN_ZOOM,
      centerX: 60,
      centerY: 40,
    });
  });

  it("두 점의 거리와 중점을 계산한다", () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(getMidpoint({ x: 10, y: 20 }, { x: 30, y: 40 })).toEqual({
      x: 20,
      y: 30,
    });
  });

  it("확대된 viewport가 공연장 영역을 벗어나지 않도록 제한한다", () => {
    expect(
      clampViewport(
        {
          zoom: 2,
          centerX: 0,
          centerY: 100,
        },
        100,
        80,
      ),
    ).toEqual({
      zoom: 2,
      centerX: 25,
      centerY: 60,
    });
  });

  it("확대 기준점이 viewport 중심에 유지되도록 확대한다", () => {
    expect(
      zoomAt(
        {
          zoom: 1,
          centerX: 50,
          centerY: 50,
        },
        { x: 0.25, y: 0.5 },
        { x: 0.5, y: 0.5 },
        2,
        100,
        100,
      ),
    ).toEqual({
      zoom: 2,
      centerX: 25,
      centerY: 50,
    });
  });

  it("pinch 이동 위치를 반영해 확대 중심을 이동한다", () => {
    expect(
      zoomAt(
        {
          zoom: 1,
          centerX: 50,
          centerY: 50,
        },
        { x: 0.5, y: 0.5 },
        { x: 0.75, y: 0.5 },
        2,
        100,
        100,
      ),
    ).toEqual({
      zoom: 2,
      centerX: 37.5,
      centerY: 50,
    });
  });
});
