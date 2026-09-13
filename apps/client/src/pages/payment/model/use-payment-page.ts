import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";

import { useSessionStore } from "@entities/session";

import { PAYMENT_FIXTURE_RESERVATION_ID, usePaymentOrder } from "@features/payment";

interface UsePaymentPageProps {
  fixture?: boolean;
}

export const usePaymentPage = ({ fixture = false }: UsePaymentPageProps = {}) => {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const { reservationId } = useParams();
  const id = fixture ? PAYMENT_FIXTURE_RESERVATION_ID : Number(reservationId);
  const isReservationIdValid = fixture || (Number.isInteger(id) && id > 0);
  const paymentOrder = usePaymentOrder({ reservationId: id, fixture });
  const handleBack = useCallback(() => navigate(-1), [navigate]);

  return {
    handleBack,
    isReservationIdValid,
    user,
    ...paymentOrder,
  };
};
