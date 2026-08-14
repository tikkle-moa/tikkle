import { useSessionStore } from "@entities/session";

import { useLogout } from "@features/auth";

export const useMyPage = () => {
  const user = useSessionStore((state) => state.user);
  const { handleLogout } = useLogout();

  return {
    handleLogout,
    user,
  };
};
