import { Outlet } from "react-router";

import type { AppLayoutOutletContext } from "@shared/model/outlet-context.types";

import { Header, SecondaryHeader } from "@widgets/header";
import { MobileBottomNavigation } from "@widgets/mobile-navigation";

import { useSecondaryHeaderVisibility } from "../model/use-secondary-header-visibility";

interface AppLayoutProps {
  showHeader?: boolean;
}

const AppLayout = ({ showHeader = true }: AppLayoutProps) => {
  const { heroRef, isSecondaryHeaderVisible, scrollContainerRef } = useSecondaryHeaderVisibility();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {showHeader && (
        <div className="shrink-0 border-b border-gray-200 bg-white">
          <Header />
          {isSecondaryHeaderVisible && <SecondaryHeader />}
        </div>
      )}

      <main ref={scrollContainerRef} className="min-h-0 grow scrollbar-thin overflow-y-auto">
        <div className="mx-auto min-h-full w-full max-w-7xl px-4 py-10 pb-16 md:pb-10">
          <Outlet context={{ heroRef } satisfies AppLayoutOutletContext} />
        </div>
      </main>

      <MobileBottomNavigation />
    </div>
  );
};

export default AppLayout;
