import { Client } from "@stomp/stompjs";

import { STOMP_BROKER_URL, STOMP_HEARTBEAT_INTERVAL_MS, STOMP_RECONNECT_DELAY_MS } from "./stomp.constants";

export const createStompClient = () =>
  new Client({
    brokerURL: STOMP_BROKER_URL,
    reconnectDelay: STOMP_RECONNECT_DELAY_MS,
    heartbeatIncoming: STOMP_HEARTBEAT_INTERVAL_MS,
    heartbeatOutgoing: STOMP_HEARTBEAT_INTERVAL_MS,
    onStompError: (frame) => {
      console.error("STOMP broker error:", frame.headers.message);
    },
  });
