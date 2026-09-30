import { useSyncExternalStore } from "react";

const INTERVAL_MS = 1000;

let currentTime = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (listeners.size === 1) {
    currentTime = Date.now();

    intervalId = setInterval(() => {
      currentTime = Date.now();
      listeners.forEach((listener) => listener());
    }, INTERVAL_MS);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
};

const getSnapshot = () => currentTime;

export const useCurrentTime = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
