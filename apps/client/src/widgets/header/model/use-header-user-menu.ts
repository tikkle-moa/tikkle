import { useState } from "react";

export const useHeaderUserMenu = () => {
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
