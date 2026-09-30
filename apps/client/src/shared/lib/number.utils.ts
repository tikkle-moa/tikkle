export const toRound = (value: number, decimalPlaces: number = 0): number => {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const formatPrice = (price: number) => {
  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
};
