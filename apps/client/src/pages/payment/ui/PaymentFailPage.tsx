import { Link } from "react-router";

import { AlertCircle } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import DetailMessage from "@shared/ui/DetailMessage";

import { usePaymentFailPage } from "../model/use-payment-result-page";

const PaymentFailPage = () => {
  const { errorMessage, isRequestValid, status } = usePaymentFailPage();

  if (!isRequestValid) {
    return <DetailMessage title="취소할 결제 주문을 찾지 못했습니다." description="예매 내역에서 상태를 다시 확인해 주세요." />;
  }

  if (status === "pending") {
    return <DetailMessage title="결제 취소를 처리하고 있습니다." description="잠시만 기다려 주세요." />;
  }

  if (status === "failed") {
    return <DetailMessage title="결제 취소를 확인하지 못했습니다." description={errorMessage ?? "예매 내역에서 상태를 다시 확인해 주세요."} />;
  }

  return (
    <section className="mx-auto flex min-h-80 max-w-screen-sm flex-col items-center justify-center text-center">
      <AlertCircle className="size-12 text-amber-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-gray-950">결제가 취소되었습니다</h1>
      <p className="mt-2 text-sm text-gray-500">선택한 좌석은 다시 예매할 수 있습니다.</p>
      <Link to={ROUTE_PATHS.HOME} className="bg-brand-primary mt-7 rounded-xl px-5 py-3 font-bold text-white">
        홈으로 이동
      </Link>
    </section>
  );
};

export default PaymentFailPage;
