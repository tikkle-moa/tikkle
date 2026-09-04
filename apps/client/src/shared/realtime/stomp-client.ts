import { Client } from "@stomp/stompjs";

const webSocketUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

export const createStompClient = () =>
  new Client({
    brokerURL: webSocketUrl,
    reconnectDelay: 5_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    onStompError: (frame) => {
      console.error("STOMP error:", frame.headers.message);
    },
  });
