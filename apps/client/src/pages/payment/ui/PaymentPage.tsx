import { useNavigate } from "react-router";

import { ArrowLeft, Clock3 } from "lucide-react";

import DetailMessage from "@shared/ui/DetailMessage";

import { useSessionStore } from "@entities/session";

import { PaymentOrderSummary, TossPaymentWidget } from "@features/payment";

import { usePaymentPage } from "../model/use-payment-page";

interface PaymentPageProps {
  fixture?: boolean;
}

const PaymentPage = ({ fixture = false }: PaymentPageProps) => {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const { order, errorMessage, isLoading, isReservationIdValid } = usePaymentPage(fixture);

  if (!isReservationIdValid) {
    return <DetailMessage title="잘못된 결제 주문입니다." description="결제 주문 번호를 다시 확인해 주세요." />;
  }

  if (isLoading) {
    return <DetailMessage title="결제 주문서를 불러오는 중입니다." description="잠시만 기다려 주세요." />;
  }

  if (errorMessage || !order || !user) {
    return <DetailMessage title="결제 주문서를 불러오지 못했습니다." description={errorMessage ?? "잠시 후 다시 시도해 주세요."} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="hover:text-brand-primary inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        이전 화면으로
      </button>

      <header className="mt-5">
        <p className="text-brand-primary text-sm font-semibold">결제</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">주문서를 확인해 주세요</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
          <Clock3 className="size-4" aria-hidden />
          결제 가능 시간: {new Date(order.paymentExpiresAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}까지
        </p>
      </header>

      <div className="mt-7 space-y-6">
        <PaymentOrderSummary order={order} />
        <TossPaymentWidget key={order.orderId} order={order} user={user} />
      </div>
    </div>
  );
};

export default PaymentPage;
