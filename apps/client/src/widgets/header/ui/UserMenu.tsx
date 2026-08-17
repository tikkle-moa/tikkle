import { Link } from "react-router";

import { CalendarDays, ChevronDown, Heart, LogOut } from "lucide-react";

import { ROUTE_PATHS } from "@shared/config/router.config";
import ProfileImage from "@shared/ui/ProfileImage";

import { useHeaderUserMenu } from "../model/use-header-user-menu";

interface UserMenuProps {
  nickname: string;
  profileImageUrl: string | null;
  onLogout: () => void;
}

const UserMenu = ({ nickname, profileImageUrl, onLogout }: UserMenuProps) => {
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
        <ProfileImage alt={`${nickname} 프로필 이미지`} className="size-7" src={profileImageUrl} />
        <span>{nickname}</span>
        <ChevronDown aria-hidden="true" className={isUserMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} size={16} />
      </button>

      {isUserMenuOpen && (
        <div className="absolute right-0 z-10 mt-2 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg" id="user-menu">
          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            to={ROUTE_PATHS.MY_RESERVATIONS}
            onClick={handleUserMenuClose}
          >
            <CalendarDays aria-hidden="true" size={16} />내 예약
          </Link>

          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            to={ROUTE_PATHS.MY_FAVORITES}
            onClick={handleUserMenuClose}
          >
            <Heart aria-hidden="true" size={16} />
            관심
          </Link>

          <div className="my-1 border-t border-gray-100" />

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
