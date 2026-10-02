import { type FormEvent, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@tikkle/api-types";

import { apiClient } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/router.config";

import { type MyReservation, RESERVATION_QUERY_KEYS } from "@entities/reservation";

import { MY_RESERVATION_QUERY_KEYS } from "./my-reservation-detail.constants";
import { useMyReservationSeatMap } from "./use-my-reservation-seat-map";

export const useMyReservationDetail = () => {
  const { reservationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const id = Number(reservationId);
  const isParamValid = Number.isInteger(id) && id > 0;
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelConfirmationOpen, setIsCancelConfirmationOpen] = useState(false);
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const requestIdRef = useRef<{ id: string; refundReceiveAccount: string | null } | null>(null);
  const fromMyReservations = (location.state as { fromMyReservations?: boolean } | null)?.fromMyReservations === true;

  const handleBackToReservations = () => {
    if (fromMyReservations) {
      navigate(-1);
      return;
    }

    navigate(ROUTE_PATHS.MY_RESERVATIONS);
  };

  const reservationQuery = useQuery({
    queryKey: MY_RESERVATION_QUERY_KEYS.detail(id),
    enabled: isParamValid,
    initialData: () => queryClient.getQueryData<MyReservation[]>(RESERVATION_QUERY_KEYS.my())?.find(({ id: cachedId }) => cachedId === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(RESERVATION_QUERY_KEYS.my())?.dataUpdatedAt,
    queryFn: async () => {
      const { data, error, response } = await apiClient.GET("/api/reservations/{reservationId}", {
        params: { path: { reservationId: id } },
      });

      if (!response.ok || error || !data) {
        throw new Error("예매 상세 정보를 불러오지 못했습니다.");
      }

      return data.data;
    },
  });
  const reservation = reservationQuery.data;
  const seatMap = useMyReservationSeatMap(reservation);

  const cancelReservation = async (refundReceiveAccount: components["schemas"]["RefundReceiveAccount"] | null = null) => {
    if (!isParamValid || isCancelling) return;

    setIsCancelling(true);
    const refundAccountKey = refundReceiveAccount ? JSON.stringify(refundReceiveAccount) : null;
    const previousRequest = requestIdRef.current;
    const requestId = previousRequest?.refundReceiveAccount === refundAccountKey ? previousRequest.id : crypto.randomUUID();
    requestIdRef.current = { id: requestId, refundReceiveAccount: refundAccountKey };

    try {
      const { data, error, response } = await apiClient.POST("/api/reservations/{reservationId}/cancel", {
        params: { path: { reservationId: id } },
        body: { requestId, refundReceiveAccount },
      });

      if (!response.ok || error || !data) {
        throw new Error("예매 취소에 실패했습니다.");
      }

      requestIdRef.current = null;
      queryClient.setQueryData<components["schemas"]["MyReservationResponse"]>(MY_RESERVATION_QUERY_KEYS.detail(id), (reservation) =>
        reservation ? { ...reservation, status: data.data.status } : reservation,
      );
      queryClient.setQueryData<MyReservation[]>(RESERVATION_QUERY_KEYS.my(), (reservations) =>
        reservations?.map((reservation) => (reservation.id === id ? { ...reservation, status: data.data.status } : reservation)),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MY_RESERVATION_QUERY_KEYS.detail(id) }),
        queryClient.invalidateQueries({ queryKey: RESERVATION_QUERY_KEYS.my() }),
      ]);

      if (data.data.status === "REFUNDED") {
        toast.success("예매가 취소되었습니다.");
      } else if (data.data.status === "REFUND_ACCOUNT_REQUIRED") {
        toast("환불 계좌 정보를 입력해 주세요.");
      } else {
        toast("예매 취소를 확인하고 있어요.");
      }
    } catch {
      toast.error("예매 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancel = () => {
    if (isCancelling) return;
    setIsCancelConfirmationOpen(true);
  };

  const handleConfirmCancel = () => {
    setIsCancelConfirmationOpen(false);
    void cancelReservation();
  };

  const handleDismissCancel = () => setIsCancelConfirmationOpen(false);

  const handleRefundAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void cancelReservation({ bank: bank.trim(), accountNumber: accountNumber.trim(), holderName: holderName.trim() });
  };

  return {
    isParamValid,
    reservation,
    isPending: reservationQuery.isPending,
    isError: reservationQuery.isError,
    seatMap,
    isCancelling,
    isCancelConfirmationOpen,
    handleCancel,
    handleConfirmCancel,
    handleDismissCancel,
    bank,
    setBank,
    accountNumber,
    setAccountNumber,
    holderName,
    setHolderName,
    handleRefundAccountSubmit,
    handleBackToReservations,
  };
};
