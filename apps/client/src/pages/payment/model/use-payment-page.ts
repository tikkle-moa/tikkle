import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";

import { useSessionStore } from "@entities/session";

import { usePaymentOrder } from "./use-payment-order";

export const usePaymentPage = () => {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const { reservationId } = useParams();
  const id = Number(reservationId);
  const isReservationIdValid = Number.isInteger(id) && id > 0;
  const paymentOrder = usePaymentOrder({ reservationId: id });
  const handleBack = useCallback(() => navigate(-1), [navigate]);

  return {
    handleBack,
    isReservationIdValid,
    user,
    ...paymentOrder,
  };
};
