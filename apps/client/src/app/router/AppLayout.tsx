import { Outlet } from "react-router";

import { Header } from "@widgets/header";

const AppLayout = () => {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="grow scrollbar-thin overflow-y-auto">
        <div className="mx-auto min-h-0 w-full max-w-7xl px-4 pt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
