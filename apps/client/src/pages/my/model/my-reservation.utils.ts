const currencyFormatter = new Intl.NumberFormat("ko-KR");

export const formatReservationDate = (date: string) => new Date(date).toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" });

export const formatReservationAmount = (amount: number) => `${currencyFormatter.format(amount)}원`;
