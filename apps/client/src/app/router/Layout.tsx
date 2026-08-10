import { Outlet } from "react-router";

import { Header } from "@widgets/header";

const Layout = () => {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="mx-auto min-h-0 w-full max-w-7xl grow scrollbar-thin overflow-y-auto px-4 pt-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
