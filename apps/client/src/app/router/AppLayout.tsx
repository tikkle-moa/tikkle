import { Outlet, useLocation } from "react-router";

import { MOBILE_HEADER_HIDDEN_PATHS } from "@shared/config/router.config";

import { Header, SecondaryHeader } from "@widgets/header";
import { MobileBottomNavigation } from "@widgets/mobile-navigation";

import type { AppLayoutOutletContext } from "../model/app-layout-outlet-context.types";
import { useSecondaryHeaderVisibility } from "../model/use-secondary-header-visibility";

const AppLayout = () => {
  const { pathname } = useLocation();
  const isMobileHeaderHidden = MOBILE_HEADER_HIDDEN_PATHS.includes(pathname as (typeof MOBILE_HEADER_HIDDEN_PATHS)[number]);
  const { categoryRef, isSecondaryHeaderVisible, scrollContainerRef } = useSecondaryHeaderVisibility();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className={`shrink-0 border-b border-gray-200 bg-white ${isMobileHeaderHidden ? "hidden md:block" : ""}`}>
        <Header />

        {isSecondaryHeaderVisible && <SecondaryHeader />}
      </div>

      <main ref={scrollContainerRef} className="min-h-0 grow scrollbar-thin overflow-y-auto">
        <div className="mx-auto min-h-full w-full max-w-7xl px-4 py-10 pb-16 md:pb-10">
          <Outlet context={{ categoryRef } satisfies AppLayoutOutletContext} />
        </div>
      </main>

      <MobileBottomNavigation />
    </div>
  );
};

export default AppLayout;
