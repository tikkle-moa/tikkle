import type { PropsWithChildren } from "react";
import { MemoryRouter, useLocation } from "react-router";

import { act, renderHook } from "@testing-library/react";

import { DEFAULT_MY_RESERVATION_FILTER } from "@pages/my/model/my-reservation-filter.constants";
import { useMyReservationFilter } from "@pages/my/model/use-my-reservation-filter";

import { makeMyReservation } from "../fixtures/my-reservation.fixture";

const reservations = [
  makeMyReservation({ id: 1, status: "SUCCEEDED" }),
  makeMyReservation({ id: 2, status: "PAYMENT_PENDING" }),
  makeMyReservation({ id: 3, status: "PAYMENT_CONFIRMING" }),
  makeMyReservation({ id: 4, status: "CANCELLATION_PENDING" }),
  makeMyReservation({ id: 5, status: "REFUND_ACCOUNT_REQUIRED" }),
  makeMyReservation({ id: 6, status: "CANCELLED" }),
  makeMyReservation({ id: 7, status: "REFUND_REQUIRED" }),
  makeMyReservation({ id: 8, status: "REFUNDED" }),
  makeMyReservation({ id: 9, status: "EXPIRED" }),
  makeMyReservation({ id: 10, status: "FAILED" }),
];

const makeWrapper = (initialEntry = "/my/reservations") =>
  function Wrapper({ children }: PropsWithChildren) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };

describe("useMyReservationFilter", () => {
  it("완료 예매를 기본으로 선택하고 상태별 목록을 반환한다", () => {
    const { result } = renderHook(() => useMyReservationFilter({ reservations }), { wrapper: makeWrapper() });

    expect(result.current.selectedFilter).toBe(DEFAULT_MY_RESERVATION_FILTER);
    expect(result.current.filteredReservations.map(({ status }) => status)).toEqual(["SUCCEEDED"]);

    const expectedStatusesByFilter = [
      ["ALL", reservations.map(({ status }) => status)],
      ["PENDING", ["PAYMENT_PENDING", "PAYMENT_CONFIRMING"]],
      ["CANCELLATION_OR_REFUND", ["CANCELLATION_PENDING", "REFUND_ACCOUNT_REQUIRED", "CANCELLED", "REFUND_REQUIRED", "REFUNDED"]],
      ["EXPIRED", ["EXPIRED"]],
      ["FAILED", ["FAILED"]],
    ] as const;

    expectedStatusesByFilter.forEach(([filterId, expectedStatuses]) => {
      act(() => result.current.handleFilterChange(filterId));

      expect(result.current.filteredReservations.map(({ status }) => status)).toEqual(expectedStatuses);
    });
  });

  it("URL에서 선택 필터를 복원하고 변경 사항을 URL에 반영한다", () => {
    const { result } = renderHook(() => ({ filter: useMyReservationFilter({ reservations }), search: useLocation().search }), {
      wrapper: makeWrapper("/my/reservations?keep=1&filter=PENDING"),
    });

    expect(result.current.filter.selectedFilter).toBe("PENDING");
    expect(result.current.filter.filteredReservations.map(({ status }) => status)).toEqual(["PAYMENT_PENDING", "PAYMENT_CONFIRMING"]);

    act(() => result.current.filter.handleFilterChange("ALL"));

    expect(result.current.filter.selectedFilter).toBe("ALL");
    expect(new URLSearchParams(result.current.search).get("keep")).toBe("1");
    expect(new URLSearchParams(result.current.search).get("filter")).toBe("ALL");

    act(() => result.current.filter.handleFilterChange("SUCCEEDED"));

    expect(result.current.filter.selectedFilter).toBe("SUCCEEDED");
    expect(new URLSearchParams(result.current.search).get("keep")).toBe("1");
    expect(new URLSearchParams(result.current.search).get("filter")).toBeNull();
  });

  it("유효하지 않은 URL 필터에는 기본 필터를 적용한다", () => {
    const { result } = renderHook(() => useMyReservationFilter({ reservations }), {
      wrapper: makeWrapper("/my/reservations?filter=UNKNOWN"),
    });

    expect(result.current.selectedFilter).toBe(DEFAULT_MY_RESERVATION_FILTER);
    expect(result.current.filteredReservations.map(({ status }) => status)).toEqual(["SUCCEEDED"]);
  });
});
