import { Outlet } from "react-router";

import { Header } from "@widgets/header";
import { MobileBottomNavigation } from "@widgets/mobile-navigation";

const AppLayout = () => {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="shrink-0">
        <Header />
      </div>

      <main className="min-h-0 grow scrollbar-thin overflow-y-auto">
        <div className="mx-auto min-h-full w-full max-w-7xl px-4 py-10 pb-16 md:pb-10">
          <Outlet />
        </div>
      </main>
      <MobileBottomNavigation />
    </div>
  );
};

export default AppLayout;
