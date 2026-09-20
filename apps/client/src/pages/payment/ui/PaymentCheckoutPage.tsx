import { generatePath, useLocation, useNavigate, useParams } from "react-router";

import { ArrowRight } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import DetailMessage from "@shared/ui/DetailMessage";

import { PaymentOrderSummary, isPaymentOrder } from "@features/payment";

import { usePaymentOrder } from "../model/use-payment-order";

const PaymentCheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { reservationId } = useParams();
  const id = Number(reservationId);
  const isReservationIdValid = Number.isInteger(id) && id > 0;
  const initialOrder = isPaymentOrder(location.state) ? location.state : undefined;
  const { order, errorMessage, isLoading } = usePaymentOrder({ reservationId: id, initialOrder });

  if (!isReservationIdValid) {
    return <DetailMessage title="잘못된 결제 주문입니다." description="결제 주문 번호를 다시 확인해 주세요." />;
  }

  if (isLoading) {
    return <DetailMessage title="결제 준비 정보를 불러오는 중입니다." description="잠시만 기다려 주세요." />;
  }

  if (errorMessage || !order) {
    return <DetailMessage title="결제 준비 정보를 불러오지 못했습니다." description={errorMessage ?? "잠시 후 다시 시도해 주세요."} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-6">
      <header>
        <p className="text-brand-primary text-sm font-semibold">결제 준비</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">결제 주문을 확인해 주세요</h1>
        <p className="mt-2 text-sm text-gray-500">결제 예정 금액과 좌석 정보를 확인한 뒤 결제수단을 선택할 수 있습니다.</p>
      </header>
      <div className="mt-7">
        <PaymentOrderSummary order={order} />
      </div>
      <button
        type="button"
        className="bg-brand-primary mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-base font-bold text-white"
        onClick={() => navigate(generatePath(ROUTE_PATHS.PAYMENT, { reservationId: String(id) }), { state: order })}
      >
        결제하러 가기
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
};

export default PaymentCheckoutPage;
