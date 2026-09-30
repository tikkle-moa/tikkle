import { useState } from "react";

interface UseExpandableListProps<T> {
  items: T[];
  visibleCount: number;
}

export const useExpandableList = <T>({ items, visibleCount }: UseExpandableListProps<T>) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const canExpand = items.length > visibleCount;
  const visibleItems = isExpanded ? items : items.slice(0, visibleCount);

  return {
    visibleItems,
    isExpanded,
    canExpand,
    handleToggleExpanded,
  };
};
