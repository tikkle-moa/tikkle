import { useEffect, useRef } from "react";

import type { IMessage, StompHeaders } from "@stomp/stompjs";

import { useStompStore } from "./stomp.store";

interface UseStompSubscriptionOptions {
  destination: string;
  onMessage: (message: IMessage) => void;
  headers?: StompHeaders;
  enabled?: boolean;
}

export const useStompSubscription = ({ destination, onMessage, headers, enabled = true }: UseStompSubscriptionOptions) => {
  const client = useStompStore((state) => state.client);
  const connectionStatus = useStompStore((state) => state.connectionStatus);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!client || connectionStatus !== "connected" || !client.connected) {
      return;
    }

    const subscription = client.subscribe(
      destination,
      (message) => {
        onMessageRef.current(message);
      },
      headers,
    );

    return () => {
      if (client.connected) {
        subscription.unsubscribe();
      }
    };
  }, [client, connectionStatus, destination, enabled, headers]);
};
