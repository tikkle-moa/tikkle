import { useLogout } from "@features/auth";

export const useHeader = () => {
  const { handleLogout } = useLogout();

  return {
    handleLogout,
  };
};
