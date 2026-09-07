import type { Client } from "@stomp/stompjs";
import { create } from "zustand";

import { refreshAccessToken, subscribeAccessTokenRefresh } from "@shared/api/refresh-token";

import { createStompClient } from "./stomp-client";
import { STOMP_MAX_RETRY_DELAY_MS, STOMP_RETRY_DELAY_MS } from "./stomp.constants";
import type { StompConnectionStatus } from "./stomp.types";

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryPromise: Promise<void> | null = null;
let recoveryGeneration = 0;
let retryAttempt = 0;
let lifecycleVersion = 0;

interface StompStore {
  client: Client | null;
  connectionStatus: StompConnectionStatus;
  sessionExpiredHandler: (() => void) | null;

  getClient: () => Client;
  disconnect: () => Promise<void>;
  recover: () => Promise<void>;
  reconnectAfterRefresh: () => Promise<void>;
  setSessionExpiredHandler: (handler: () => void) => void;
}

export const useStompStore = create<StompStore>((set, get) => {
  const scheduleReconnect = (delay: number, version: number) => {
    if (reconnectTimer) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;

      if (version !== lifecycleVersion || get().client) {
        return;
      }

      try {
        get().getClient();
      } catch (error) {
        console.error("STOMP Client 재연결 실패:", error);

        if (version !== lifecycleVersion) {
          return;
        }

        set({
          client: null,
          connectionStatus: "disconnected",
        });

        scheduleRetry(version);
      }
    }, delay);
  };

  const scheduleRetry = (version: number) => {
    const retryDelay = Math.min(STOMP_RETRY_DELAY_MS * 2 ** retryAttempt, STOMP_MAX_RETRY_DELAY_MS);

    retryAttempt += 1;
    scheduleReconnect(retryDelay, version);
  };

  const invalidateLifecycle = () => {
    lifecycleVersion += 1;
    recoveryGeneration += 1;
    recoveryPromise = null;
    retryAttempt = 0;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    return lifecycleVersion;
  };

  return {
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
      invalidateLifecycle();

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

    reconnectAfterRefresh: async () => {
      const client = get().client;

      if (!client) {
        return;
      }

      const version = invalidateLifecycle();

      set({
        client: null,
        connectionStatus: "disconnected",
      });

      try {
        await client.deactivate();
      } catch (error) {
        console.error("STOMP reconnect 종료 실패:", error);

        if (version !== lifecycleVersion) {
          return;
        }

        set({
          client: null,
          connectionStatus: "disconnected",
        });

        scheduleRetry(version);
        return;
      }

      if (version !== lifecycleVersion || get().client !== null) {
        return;
      }

      try {
        get().getClient();
      } catch (error) {
        console.error("STOMP Client 재생성 실패:", error);

        if (version !== lifecycleVersion) {
          return;
        }

        set({
          client: null,
          connectionStatus: "disconnected",
        });

        scheduleRetry(version);
      }
    },

    recover: async () => {
      if (recoveryPromise) {
        return recoveryPromise;
      }

      const client = get().client;

      if (!client) {
        return;
      }

      const version = lifecycleVersion;
      const generation = recoveryGeneration + 1;

      recoveryGeneration = generation;

      const recovery = (async () => {
        const scheduleRecoveryRetry = async (error?: unknown) => {
          if (error) {
            console.error("STOMP recover 실패:", error);
          }

          if (version !== lifecycleVersion || get().client !== client) {
            return;
          }

          set({
            client: null,
            connectionStatus: "disconnected",
          });

          try {
            await client.deactivate();
          } catch (deactivateError) {
            console.error("STOMP recover 종료 실패:", deactivateError);
          }

          if (version !== lifecycleVersion || get().client !== null) {
            return;
          }

          scheduleRetry(version);
        };

        set({ connectionStatus: "connecting" });

        try {
          const refreshResult = await refreshAccessToken();

          if (get().client !== client || lifecycleVersion !== version) {
            return;
          }

          if (refreshResult.type === "authentication-failed") {
            try {
              await get().disconnect();
            } catch (error) {
              console.error("STOMP 인증 실패 후 연결 종료 실패:", error);
            } finally {
              get().sessionExpiredHandler?.();
            }

            return;
          }

          if (refreshResult.type === "success") {
            await get().reconnectAfterRefresh();
            return;
          }

          await scheduleRecoveryRetry();
        } catch (error) {
          await scheduleRecoveryRetry(error);
        }
      })();

      recoveryPromise = recovery.finally(() => {
        if (recoveryGeneration === generation) {
          recoveryPromise = null;
        }
      });

      return recoveryPromise;
    },

    setSessionExpiredHandler: (handler) => {
      set({ sessionExpiredHandler: handler });
    },
  };
});

subscribeAccessTokenRefresh(() => useStompStore.getState().reconnectAfterRefresh());
