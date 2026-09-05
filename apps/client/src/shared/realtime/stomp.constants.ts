export const STOMP_BROKER_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

export const STOMP_RETRY_DELAY_MS = 5_000;
export const STOMP_MAX_RETRY_DELAY_MS = 30_000;
export const STOMP_HEARTBEAT_INTERVAL_MS = 10_000;
