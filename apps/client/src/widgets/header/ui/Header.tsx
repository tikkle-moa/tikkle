import { ROUTE_PATHS } from "../../../shared/config/router.config";
import { useHeader } from "../model/use-header";

const Header = () => {
  const { handleNavigation } = useHeader();

  return (
    <header className="bg-blue-500 p-4 text-white">
      <nav className="flex items-center justify-between">
        <div className="text-lg font-bold">Tikkle</div>
        <div className="space-x-4">
          <button className="hover:underline" onClick={() => handleNavigation(ROUTE_PATHS.HOME)}>
            Home
          </button>
          <button className="hover:underline" onClick={() => handleNavigation(ROUTE_PATHS.CONCERTS)}>
            Concerts
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
