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

describe("useMyReservationFilter", () => {
  it("완료 예매를 기본으로 선택하고 상태별 목록을 반환한다", () => {
    const { result } = renderHook(() => useMyReservationFilter({ reservations }));

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
});
