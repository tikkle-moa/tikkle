import { useState } from "react";

export const useMobileConcertListFilterToggle = () => {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const toggleMobileFilter = () => {
    setIsMobileFilterOpen((isOpen) => !isOpen);
  };

  return {
    isMobileFilterOpen,
    toggleMobileFilter,
  };
};
