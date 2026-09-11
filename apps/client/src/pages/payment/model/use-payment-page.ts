import { useParams } from "react-router";

import { PAYMENT_FIXTURE_RESERVATION_ID, usePaymentOrder } from "@features/payment";

export const usePaymentPage = (fixture = false) => {
  const { reservationId } = useParams();
  const id = fixture ? PAYMENT_FIXTURE_RESERVATION_ID : Number(reservationId);
  const isReservationIdValid = fixture || (Number.isInteger(id) && id > 0);
  const paymentOrder = usePaymentOrder(id, fixture);

  return {
    isReservationIdValid,
    ...paymentOrder,
  };
};
