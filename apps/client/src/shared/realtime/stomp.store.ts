import type { Client } from "@stomp/stompjs";
import { create } from "zustand";

import { createStompClient } from "./stomp-client";
import type { StompConnectionStatus } from "./stomp.types";

interface StompStore {
  client: Client | null;
  connectionStatus: StompConnectionStatus;

  getClient: () => Client;
  disconnect: () => Promise<void>;
}

export const useStompStore = create<StompStore>((set, get) => ({
  client: null,
  connectionStatus: "disconnected",

  getClient: () => {
    const currentClient = get().client;

    if (currentClient) {
      return currentClient;
    }

    const client = createStompClient({
      onConnect: () => {
        set({ connectionStatus: "connected" });
      },
      onWebSocketClose: () => {
        set({ connectionStatus: "disconnected" });
      },
    });

    set({
      client,
      connectionStatus: "connecting",
    });

    client.activate();

    return client;
  },

  disconnect: async () => {
    const client = get().client;

    if (!client) {
      return;
    }

    await client.deactivate();

    set({
      client: null,
      connectionStatus: "disconnected",
    });
  },
}));
