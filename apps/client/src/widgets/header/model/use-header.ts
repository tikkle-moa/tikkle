import { useNavigate } from "react-router";

import { useLogout } from "@features/auth";

export const useHeader = () => {
  const navigate = useNavigate();
  const { handleLogout } = useLogout();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return {
    handleNavigation,
    handleLogout,
  };
};
