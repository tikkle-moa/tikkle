import { Outlet } from "react-router";

import { useLogoutNavigator } from "../model/use-logout-navigator";
import { useSessionInitializer } from "../model/use-session-initializer";

const RootLayout = () => {
  useSessionInitializer();
  useLogoutNavigator();

  return <Outlet />;
};

export default RootLayout;
