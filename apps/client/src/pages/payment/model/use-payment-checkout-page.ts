import { useCallback } from "react";
import { generatePath, useNavigate, useParams } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

export const usePaymentCheckoutPage = () => {
  const navigate = useNavigate();
  const { reservationId } = useParams();
  const id = Number(reservationId);
  const isReservationIdValid = Number.isInteger(id) && id > 0;

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleContinueToPayment = useCallback(() => navigate(generatePath(ROUTE_PATHS.PAYMENT, { reservationId: String(id) })), [id, navigate]);

  return { id, isReservationIdValid, handleBack, handleContinueToPayment };
};
