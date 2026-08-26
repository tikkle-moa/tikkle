export const toDate = (dateTime: string | Date) => (typeof dateTime === "string" ? new Date(dateTime) : dateTime);

export const formatDate = (dateTime: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = toDate(dateTime);
  return date.toLocaleDateString(undefined, options);
};

export const formatDateTime = (dateTime: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = toDate(dateTime);
  return date.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short", ...options });
};
