import { useState } from "react";

import type { UseHeaderUserMenuResult } from "./header.types";

export const useHeaderUserMenu = (): UseHeaderUserMenuResult => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen((isOpen) => !isOpen);
  };

  const handleUserMenuClose = () => {
    setIsUserMenuOpen(false);
  };

  return {
    isUserMenuOpen,
    handleUserMenuClose,
    handleUserMenuToggle,
  };
};
