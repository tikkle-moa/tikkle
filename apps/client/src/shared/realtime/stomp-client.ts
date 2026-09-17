import { Client, type IMessage, type StompHeaders, type StompSubscription } from "@stomp/stompjs";
import type { StompFailureMessage } from "@tikkle/api-types";

import { STOMP_BROKER_URL, STOMP_HEARTBEAT_INTERVAL_MS } from "./stomp.constants";
import type {
  EventPath,
  PathParams,
  PublishPath,
  StompEventSubscribeProps,
  StompPublishProps,
  StompSubscribeProps,
  SubscribePath,
} from "./stomp.types";

interface StompClientProps {
  onConnect: () => void;
  onWebSocketClose: () => void;
}

class StompClient {
  private static readonly PUBLISH_PREFIX = "/api";
  private static readonly SUBSCRIBE_PREFIX = "/user/queue";
  private static readonly EVENT_PREFIX = "/topic";

  private readonly client: Client;

  constructor({ onConnect, onWebSocketClose }: StompClientProps) {
    this.client = new Client({
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
  }

  activate() {
    this.client.activate();
  }

  async deactivate() {
    await this.client.deactivate();
  }

  publish<TPath extends PublishPath>(props: StompPublishProps<TPath>) {
    const { path, command, headers } = props;
    const pathParams = "pathParams" in props ? props.pathParams : undefined;
    const destination = this.buildDestination(StompClient.PUBLISH_PREFIX, path, pathParams);

    this.client.publish({ destination: destination, headers, body: JSON.stringify(command) });
  }

  subscribe<TPath extends SubscribePath>(props: StompSubscribeProps<TPath>): StompSubscription {
    const { path, callback, errorCallback, headers } = props;
    const pathParams = "pathParams" in props ? props.pathParams : undefined;
    const destination = this.buildDestination(StompClient.SUBSCRIBE_PREFIX, path, pathParams);

    const subscription = this.client.subscribe(destination, (frame) => this.handleFrame(frame, callback, errorCallback), headers);
    return this.createSafeSubscription(subscription);
  }

  subscribeEvent<TPath extends EventPath>(props: StompEventSubscribeProps<TPath>): StompSubscription {
    const { path, callback, errorCallback, headers } = props;
    const pathParams = "pathParams" in props ? props.pathParams : undefined;
    const destination = this.buildDestination(StompClient.EVENT_PREFIX, path, pathParams);

    const subscription = this.client.subscribe(destination, (frame) => this.handleFrame(frame, callback, errorCallback), headers);
    return this.createSafeSubscription(subscription);
  }

  private buildDestination(prefix: string, path: string, pathParams?: PathParams) {
    const resolvedPath = path.replace(/{(\w+)}/g, (_, key: string) => {
      const value = pathParams?.[key];
      if (value === undefined) throw new Error(`Missing path parameter: ${key}`);
      return String(value);
    });
    return `${prefix}${resolvedPath}`;
  }

  private handleFrame<TMessage>(frame: IMessage, callback: (message: TMessage) => void, errorCallback?: (error: StompFailureMessage) => void) {
    const message = JSON.parse(frame.body) as TMessage | StompFailureMessage;

    if (this.isStompFailureMessage(message)) {
      errorCallback?.(message);
      return;
    }

    callback(message);
  }

  private isStompFailureMessage(message: unknown): message is StompFailureMessage {
    return typeof message === "object" && message !== null && "error" in message;
  }

  private createSafeSubscription(subscription: StompSubscription): StompSubscription {
    return {
      id: subscription.id,
      unsubscribe: (headers?: StompHeaders) => {
        if (!this.client.connected) return;

        try {
          subscription.unsubscribe(headers);
        } catch (error) {
          if (!this.client.connected) return;

          console.error("STOMP 구독 해제 중 오류가 발생했습니다:", error);
        }
      },
    };
  }
}

export default StompClient;
