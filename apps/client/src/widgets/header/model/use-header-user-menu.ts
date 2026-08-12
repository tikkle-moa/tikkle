import { useEffect, useRef, useState } from "react";

export const useHeaderUserMenu = () => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen((isOpen) => !isOpen);
  };

  const handleUserMenuClose = () => {
    setIsUserMenuOpen(false);
  };

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscapeKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscapeKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscapeKeyDown);
    };
  }, [isUserMenuOpen]);

  return {
    isUserMenuOpen,
    userMenuRef,
    handleUserMenuClose,
    handleUserMenuToggle,
  };
};
