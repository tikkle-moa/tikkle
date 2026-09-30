export const toPositiveAmount = (value: string | null) => {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
};
