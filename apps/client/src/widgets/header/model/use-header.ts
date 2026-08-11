import { useNavigate } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { useLogout } from "@features/auth";

export const useHeader = () => {
  const navigate = useNavigate();
  const { handleLogout } = useLogout();

  const goToHome = () => {
    navigate(ROUTE_PATHS.HOME);
  };

  const goToLogin = () => {
    navigate(ROUTE_PATHS.LOGIN);
  };

  return {
    goToHome,
    goToLogin,
    handleLogout,
  };
};
