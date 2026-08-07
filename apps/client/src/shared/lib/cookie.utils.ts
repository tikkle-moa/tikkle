export const getCookie = (name: string): string | null => {
  const encodedName = `${encodeURIComponent(name)}=`;

  const cookie = document.cookie.split("; ").find((item) => item.startsWith(encodedName));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(encodedName.length));
};
