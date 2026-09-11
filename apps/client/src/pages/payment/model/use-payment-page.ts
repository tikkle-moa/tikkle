import { useParams } from "react-router";

import { usePaymentOrder } from "@features/payment";

export const usePaymentPage = () => {
  const { reservationId } = useParams();
  const id = Number(reservationId);
  const isReservationIdValid = Number.isInteger(id) && id > 0;
  const paymentOrder = usePaymentOrder(id);

  return {
    isReservationIdValid,
    ...paymentOrder,
  };
};
