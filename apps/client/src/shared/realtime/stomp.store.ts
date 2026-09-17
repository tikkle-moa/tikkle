import { create } from "zustand";

import { refreshAccessToken, subscribeAccessTokenRefresh } from "@shared/api/refresh-token";

import StompClient from "./stomp-client";
import { STOMP_MAX_RETRY_DELAY_MS, STOMP_RETRY_DELAY_MS } from "./stomp.constants";
import type { StompConnectionStatus, StompRecoveryPhase } from "./stomp.types";

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryPromise: Promise<void> | null = null;
let recoveryGeneration = 0;
let retryAttempt = 0;
let lifecycleVersion = 0;
let recoveryPhase: StompRecoveryPhase = "idle";

interface StompStore {
  stompClient: StompClient | null;
  connectionStatus: StompConnectionStatus;
  sessionExpiredHandler: (() => void) | null;

  getStompClient: () => StompClient;
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

      if (version !== lifecycleVersion || get().stompClient) {
        return;
      }

      try {
        get().getStompClient();
      } catch (error) {
        console.error("STOMP Client 재연결 실패:", error);

        if (version !== lifecycleVersion) {
          return;
        }

        set({
          stompClient: null,
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
    recoveryPhase = "idle";

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    return lifecycleVersion;
  };

  return {
    stompClient: null,
    connectionStatus: "disconnected",
    sessionExpiredHandler: null,

    getStompClient: () => {
      const currentStompClient = get().stompClient;

      if (currentStompClient) {
        return currentStompClient;
      }

      const stompClient = new StompClient({
        onConnect: () => {
          if (get().stompClient !== stompClient) {
            return;
          }

          recoveryPhase = "idle";
          retryAttempt = 0;

          set({ connectionStatus: "connected" });
        },

        onWebSocketClose: () => {
          if (get().stompClient !== stompClient) {
            return;
          }

          if (recoveryPhase === "refresh-on-next-failure") {
            void get().recover();
            return;
          }

          const version = lifecycleVersion;

          if (recoveryPhase === "idle") {
            recoveryPhase = "refresh-on-next-failure";
          }

          set({
            stompClient: null,
            connectionStatus: "disconnected",
          });

          scheduleRetry(version);
        },
      });

      set({
        stompClient,
        connectionStatus: "connecting",
      });

      stompClient.activate();

      return stompClient;
    },

    disconnect: async () => {
      invalidateLifecycle();

      const stompClient = get().stompClient;

      if (!stompClient) {
        return;
      }

      set({
        stompClient: null,
        connectionStatus: "disconnected",
      });

      await stompClient.deactivate();
    },

    reconnectAfterRefresh: async () => {
      const stompClient = get().stompClient;

      if (!stompClient) {
        return;
      }

      const version = invalidateLifecycle();

      recoveryPhase = "reconnect-only";

      set({
        stompClient: null,
        connectionStatus: "disconnected",
      });

      try {
        await stompClient.deactivate();
      } catch (error) {
        console.error("STOMP reconnect 종료 실패:", error);

        if (version !== lifecycleVersion) {
          return;
        }

        set({
          stompClient: null,
          connectionStatus: "disconnected",
        });

        scheduleRetry(version);
        return;
      }

      if (version !== lifecycleVersion || get().stompClient !== null) {
        return;
      }

      try {
        get().getStompClient();
      } catch (error) {
        console.error("STOMP Client 재생성 실패:", error);

        if (version !== lifecycleVersion) {
          return;
        }

        set({
          stompClient: null,
          connectionStatus: "disconnected",
        });

        scheduleRetry(version);
      }
    },

    recover: async () => {
      if (recoveryPromise) {
        return recoveryPromise;
      }

      const stompClient = get().stompClient;

      if (!stompClient) {
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

          if (version !== lifecycleVersion || get().stompClient !== stompClient) {
            return;
          }

          recoveryPhase = "refresh-on-next-failure";

          set({
            stompClient: null,
            connectionStatus: "disconnected",
          });

          try {
            await stompClient.deactivate();
          } catch (deactivateError) {
            console.error("STOMP recover 종료 실패:", deactivateError);
          }

          if (version !== lifecycleVersion || get().stompClient !== null) {
            return;
          }

          scheduleRetry(version);
        };

        set({ connectionStatus: "connecting" });

        try {
          const refreshResult = await refreshAccessToken();

          if (get().stompClient !== stompClient || lifecycleVersion !== version) {
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
