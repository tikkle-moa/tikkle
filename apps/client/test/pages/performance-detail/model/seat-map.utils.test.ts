import { areVenueSeatStatesEqual, getConnectionStyle } from "@pages/performance-detail/model/seat-map.utils";

describe("seat-hold.utils", () => {
  it.each([
    [false, "연결 중", "실시간 좌석 상태를 동기화하고 있어요."],
    [true, "실시간 연결됨", "다른 관람객의 좌석 상태도 실시간으로 반영됩니다."],
  ])("연결 상태 %s의 표시 정보를 반환한다", (isConnected, label, description) => {
    expect(getConnectionStyle(isConnected)).toMatchObject({ label, description });
  });

  it("좌석 상태 Map의 상태와 만료 시각을 비교한다", () => {
    const expiresAt = new Date("2026-09-18T08:00:00");
    const states = new Map([[1, { status: "held_by_my_group" as const, expiresAt }]]);
    expect(areVenueSeatStatesEqual(states, states)).toBe(true);
    expect(areVenueSeatStatesEqual(states, new Map())).toBe(false);
    expect(areVenueSeatStatesEqual(states, new Map([[2, { status: "held_by_my_group", expiresAt }]]))).toBe(false);
    expect(areVenueSeatStatesEqual(states, new Map([[1, { status: "booked" }]]))).toBe(false);
    expect(areVenueSeatStatesEqual(states, new Map([[1, { status: "held_by_my_group", expiresAt: new Date(expiresAt.getTime() + 1000) }]]))).toBe(
      false,
    );
    expect(areVenueSeatStatesEqual(states, new Map([[1, { status: "held_by_my_group", expiresAt: new Date(expiresAt) }]]))).toBe(true);
  });
});
