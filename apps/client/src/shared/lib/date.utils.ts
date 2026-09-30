export const toDate = (dateTime: string | Date) => (typeof dateTime === "string" ? new Date(dateTime) : dateTime);

export const formatDate = (dateTime: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = toDate(dateTime);
  return date.toLocaleDateString(undefined, options);
};

export const formatDateTime = (dateTime: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = toDate(dateTime);
  return date.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short", ...options });
};

export const formatTime = (dateTime: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = toDate(dateTime);
  if (options?.fractionalSecondDigits) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit", ...options });
  }

  return date.toLocaleTimeString(undefined, { timeStyle: "medium", ...options });
};
