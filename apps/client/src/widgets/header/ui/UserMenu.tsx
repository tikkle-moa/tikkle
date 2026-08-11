import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { useHeaderUserMenu } from "../model/use-header-user-menu";

interface UserMenuProps {
  nickname: string;
  onLogout: () => void;
}

const UserMenu = ({ nickname, onLogout }: UserMenuProps) => {
  const { isUserMenuOpen, userMenuRef, handleUserMenuClose, handleUserMenuToggle } = useHeaderUserMenu();

  const handleLogout = () => {
    handleUserMenuClose();
    onLogout();
  };

  return (
    <div ref={userMenuRef} className="relative">
      <button
        aria-controls="user-menu"
        aria-expanded={isUserMenuOpen}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        type="button"
        onClick={handleUserMenuToggle}
      >
        <UserRound aria-hidden="true" size={18} />
        <span>{nickname}</span>
        <ChevronDown aria-hidden="true" className={isUserMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} size={16} />
      </button>

      {isUserMenuOpen && (
        <div className="absolute right-0 z-10 mt-2 w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-lg" id="user-menu">
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            type="button"
            onClick={handleLogout}
          >
            <LogOut aria-hidden="true" size={16} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
