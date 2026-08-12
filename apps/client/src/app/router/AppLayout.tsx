import { Outlet } from "react-router";

import { Header } from "@widgets/header";

const AppLayout = () => {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="shrink-0">
        <Header />
      </div>

      <main className="min-h-0 grow overflow-y-auto">
        <div className="mx-auto min-h-full w-full max-w-7xl px-4 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
