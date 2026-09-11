import { Link } from "react-router";

import { CheckCircle2 } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import DetailMessage from "@shared/ui/DetailMessage";

import { usePaymentSuccessPage } from "../model/use-payment-result-page";

const PaymentSuccessPage = () => {
  const { errorMessage, isRequestValid, status } = usePaymentSuccessPage();

  if (!isRequestValid) {
    return <DetailMessage title="결제 승인 정보가 올바르지 않습니다." description="결제 내역에서 상태를 다시 확인해 주세요." />;
  }

  if (status === "pending") {
    return <DetailMessage title="결제를 확인하고 있습니다." description="결제 창을 닫지 말고 잠시만 기다려 주세요." />;
  }

  if (status === "failed") {
    return <DetailMessage title="결제 승인에 실패했습니다." description={errorMessage ?? "결제 내역에서 상태를 다시 확인해 주세요."} />;
  }

  return (
    <section className="mx-auto flex min-h-80 max-w-screen-sm flex-col items-center justify-center text-center">
      <CheckCircle2 className="size-12 text-emerald-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-gray-950">예매가 완료되었습니다</h1>
      <p className="mt-2 text-sm text-gray-500">예매 내역은 마이페이지에서 확인할 수 있습니다.</p>
      <Link to={ROUTE_PATHS.MY_RESERVATIONS} className="bg-brand-primary mt-7 rounded-xl px-5 py-3 font-bold text-white">
        예매 내역 보기
      </Link>
    </section>
  );
};

export default PaymentSuccessPage;
