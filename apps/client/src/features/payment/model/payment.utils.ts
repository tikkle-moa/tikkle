import { PAYMENT_CUSTOMER_KEY_STORAGE_PREFIX } from "./payment.constants";

export const getPaymentCustomerKey = (userId: number) => {
  const storageKey = `${PAYMENT_CUSTOMER_KEY_STORAGE_PREFIX}.${userId}`;
  const savedCustomerKey = sessionStorage.getItem(storageKey);

  if (savedCustomerKey) {
    return savedCustomerKey;
  }

  const customerKey = `tikkle_${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, customerKey);
  return customerKey;
};
