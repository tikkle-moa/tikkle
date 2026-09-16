import { useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { useSessionStore } from "@entities/session";

import { isPaymentOrder, usePaymentOrder } from "@features/payment";

export const usePaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const { reservationId } = useParams();
  const initialOrder = isPaymentOrder(location.state) ? location.state : undefined;
  const id = Number(reservationId);
  const isReservationIdValid = Number.isInteger(id) && id > 0;
  const paymentOrder = usePaymentOrder({ reservationId: id, initialOrder });
  const handleBack = useCallback(() => navigate(-1), [navigate]);

  return {
    handleBack,
    isReservationIdValid,
    user,
    ...paymentOrder,
  };
};
