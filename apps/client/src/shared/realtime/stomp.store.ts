import type { Client } from "@stomp/stompjs";
import { create } from "zustand";

import { refreshAccessToken } from "@shared/api/refresh-token";

import { createStompClient } from "./stomp-client";
import { STOMP_MAX_RETRY_DELAY_MS, STOMP_RETRY_DELAY_MS } from "./stomp.constants";
import type { StompConnectionStatus } from "./stomp.types";

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryPromise: Promise<void> | null = null;
let retryAttempt = 0;

interface StompStore {
  client: Client | null;
  connectionStatus: StompConnectionStatus;
  sessionExpiredHandler: (() => void) | null;

  getClient: () => Client;
  disconnect: () => Promise<void>;
  recover: () => Promise<void>;
  setSessionExpiredHandler: (handler: () => void) => void;
}

const scheduleReconnect = (get: () => StompStore, delay: number) => {
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    get().getClient();
  }, delay);
};

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
        retryAttempt = 0;
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
    retryAttempt = 0;

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

      const refreshResult = await refreshAccessToken();

      if (get().client !== client) {
        return;
      }

      if (refreshResult.type === "authentication-failed") {
        await get().disconnect();
        get().sessionExpiredHandler?.();
        return;
      }

      set({
        client: null,
        connectionStatus: "disconnected",
      });

      await client.deactivate();

      if (refreshResult.type === "success") {
        retryAttempt = 0;
        scheduleReconnect(get, STOMP_RETRY_DELAY_MS);
        return;
      }

      const retryDelay = Math.min(STOMP_RETRY_DELAY_MS * 2 ** retryAttempt, STOMP_MAX_RETRY_DELAY_MS);

      retryAttempt += 1;
      scheduleReconnect(get, retryDelay);
    })().finally(() => {
      recoveryPromise = null;
    });

    return recoveryPromise;
  },

  setSessionExpiredHandler: (handler) => {
    set({ sessionExpiredHandler: handler });
  },
}));
