import { Outlet } from "react-router";

import { Header } from "@widgets/header";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="grow">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
