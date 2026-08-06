import { useEffect } from "react";

import { useSessionStore } from "../../entities/session";

export const useSessionInitializer = () => {
  const initialize = useSessionStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);
};
