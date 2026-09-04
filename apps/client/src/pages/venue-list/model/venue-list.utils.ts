export const getRegion = (address: string) => {
  return address.trim().split(/\s+/)[0];
};
