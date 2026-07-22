import { useNavigate } from "react-router";

export const useHeader = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return {
    handleNavigation,
  };
};
