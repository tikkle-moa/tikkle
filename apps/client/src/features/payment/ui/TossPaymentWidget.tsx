import type { User } from "@entities/session";

import type { PaymentOrder } from "../model/payment.types";
import { formatPaymentAmount } from "../model/payment.utils";
import { useTossPaymentWidget } from "../model/use-toss-payment-widget";

interface TossPaymentWidgetProps {
  order: PaymentOrder;
  user: User;
}

const TossPaymentWidget = ({ order, user }: TossPaymentWidgetProps) => {
  const { agreementSelector, displayedErrorMessage, handlePaymentRequest, isExpired, isRequesting, paymentMethodSelector, widgets } =
    useTossPaymentWidget({ order, user });

  return (
    <section aria-labelledby="payment-method-title" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
        <h2 id="payment-method-title" className="font-bold text-gray-900">
          결제수단
        </h2>
      </div>
      <div className="min-h-40" id={paymentMethodSelector} />
      <div className="border-t border-gray-100" id={agreementSelector} />
      {(isExpired || displayedErrorMessage) && (
        <p role="alert" className="px-5 pt-4 text-sm font-medium text-red-600 sm:px-7">
          {isExpired ? "결제 가능 시간이 만료되었습니다." : displayedErrorMessage}
        </p>
      )}
      <div className="sticky bottom-0 mt-5 border-t border-gray-200 bg-white/95 p-4 backdrop-blur sm:static sm:px-7 sm:py-5">
        <button
          type="button"
          onClick={() => void handlePaymentRequest()}
          disabled={!widgets || isRequesting || isExpired}
          className="bg-brand-primary w-full rounded-xl px-5 py-4 text-base font-bold text-white transition hover:bg-violet-700 disabled:bg-gray-300"
        >
          {isRequesting ? "결제창을 여는 중..." : `${formatPaymentAmount(order.amount)} 결제하기`}
        </button>
      </div>
    </section>
  );
};

export default TossPaymentWidget;
