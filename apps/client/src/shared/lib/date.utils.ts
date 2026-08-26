export const toDate = (dateTime: string) => new Date(dateTime);

export const formatDate = (dateTime: string | Date) => {
  const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;
  return date.toLocaleDateString();
};
