const currencyFormatter = new Intl.NumberFormat("ko-KR");

export const formatReservationAmount = (amount: number) => `${currencyFormatter.format(amount)}원`;
