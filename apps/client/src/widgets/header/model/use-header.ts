import { useEffect, useRef, useState } from "react";

import { useSessionStore } from "@entities/session";

import { useLogout } from "@features/auth";

export const useHeader = () => {
  const { handleLogout } = useLogout();
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const searchOverlayRef = useRef<HTMLDivElement>(null);

  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  const handleSearchOverlayOpen = () => {
    setIsSearchOverlayOpen(true);
  };

  const handleSearchOverlayClose = () => {
    setIsSearchOverlayOpen(false);
  };

  useEffect(() => {
    if (!isSearchOverlayOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!searchOverlayRef.current?.contains(event.target as Node)) {
        handleSearchOverlayClose();
      }
    };

    const handleEscapeKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleSearchOverlayClose();
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscapeKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscapeKeyDown);
    };
  }, [isSearchOverlayOpen]);

  return {
    handleLogout,
    handleSearchOverlayOpen,
    isSearchOverlayOpen,
    searchOverlayRef,
    status,
    user,
  };
};
