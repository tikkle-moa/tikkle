import { Client } from "@stomp/stompjs";

import { STOMP_BROKER_URL, STOMP_HEARTBEAT_INTERVAL_MS } from "./stomp.constants";

interface StompClientCallbacks {
  onConnect: () => void;
  onWebSocketClose: () => void;
}

export const createStompClient = ({ onConnect, onWebSocketClose }: StompClientCallbacks) =>
  new Client({
    brokerURL: STOMP_BROKER_URL,
    reconnectDelay: 0,
    heartbeatIncoming: STOMP_HEARTBEAT_INTERVAL_MS,
    heartbeatOutgoing: STOMP_HEARTBEAT_INTERVAL_MS,
    onConnect,
    onWebSocketClose,
    onStompError: (frame) => {
      console.error("STOMP broker error:", frame.headers.message);
    },
  });
