export const toDate = (dateTime: string) => new Date(dateTime);

export const formatDate = (dateTime: string) => {
  const date = new Date(dateTime);
  return date.toLocaleDateString();
};
