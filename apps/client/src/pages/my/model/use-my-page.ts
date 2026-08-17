import { useSessionStore } from "@entities/session";

import { useLogout } from "@features/auth";

export const useMyPage = () => {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const { handleLogout } = useLogout();

  return {
    handleLogout,
    status,
    user,
  };
};
