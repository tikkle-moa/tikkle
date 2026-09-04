import type { Client } from "@stomp/stompjs";
import { create } from "zustand";

import { refreshAccessToken } from "@shared/api/refresh-token";

import { createStompClient } from "./stomp-client";
import { STOMP_RETRY_DELAY_MS } from "./stomp.constants";
import type { StompConnectionStatus } from "./stomp.types";

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryPromise: Promise<void> | null = null;

interface StompStore {
  client: Client | null;
  connectionStatus: StompConnectionStatus;
  sessionExpiredHandler: (() => void) | null;

  getClient: () => Client;
  disconnect: () => Promise<void>;
  recover: () => Promise<void>;
  setSessionExpiredHandler: (handler: () => void) => void;
}

export const useStompStore = create<StompStore>((set, get) => ({
  client: null,
  connectionStatus: "disconnected",
  sessionExpiredHandler: null,

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
        if (get().client !== client) {
          return;
        }

        void get().recover();
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
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const client = get().client;

    if (!client) {
      return;
    }

    set({
      client: null,
      connectionStatus: "disconnected",
    });

    await client.deactivate();
  },

  recover: async () => {
    if (recoveryPromise) {
      return recoveryPromise;
    }

    const client = get().client;

    if (!client) {
      return;
    }

    recoveryPromise = (async () => {
      set({ connectionStatus: "connecting" });

      const refreshed = await refreshAccessToken().catch(() => false);

      if (get().client !== client) {
        return;
      }

      if (!refreshed) {
        await get().disconnect();
        get().sessionExpiredHandler?.();
        return;
      }

      set({
        client: null,
        connectionStatus: "disconnected",
      });

      await client.deactivate();

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        get().getClient();
      }, STOMP_RETRY_DELAY_MS);
    })().finally(() => {
      recoveryPromise = null;
    });

    return recoveryPromise;
  },

  setSessionExpiredHandler: (handler) => {
    set({ sessionExpiredHandler: handler });
  },
}));
