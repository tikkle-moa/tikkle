import { useEffect } from "react";

import { createStompClient } from "@shared/realtime/stomp-client";

import { useSessionStore } from "@entities/session";

export const useStompConnection = () => {
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const client = createStompClient();
    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [status]);
};
