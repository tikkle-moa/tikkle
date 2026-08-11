import { Outlet } from "react-router";

import { useLogoutNavigator } from "@app/model/use-logout-navigator";

const RootLayout = () => {
  useLogoutNavigator();

  return <Outlet />;
};

export default RootLayout;
