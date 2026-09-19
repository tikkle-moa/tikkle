import type { StompHeaders } from "@stomp/stompjs";
import type {
  CancelCheckoutMessage,
  CancelPaymentCommand,
  ConfirmPaymentCommand,
  ConfirmPaymentMessage,
  GetMyGroupHoldsCommand,
  GetMyGroupHoldsMessage,
  GetPaymentOrderCommand,
  HoldVenueSeatsCommand,
  HoldVenueSeatsMessage,
  PaymentOrderMessage,
  PerformanceSeatEvent,
  PerformanceSeatStatusCommand,
  PerformanceSeatStatusMessage,
  ReleaseVenueSeatsCommand,
  ReleaseVenueSeatsMessage,
  StartCheckoutCommand,
  StartCheckoutMessage,
  StompFailureMessage,
} from "@tikkle/api-types";

export type StompConnectionStatus = "disconnected" | "connecting" | "connected";
export type StompRecoveryPhase = "idle" | "refresh-on-next-failure" | "reconnect-only";

interface StompPaths {
  "/performances/{performanceId}/get-seat-status": {
    command: PerformanceSeatStatusCommand;
    message: PerformanceSeatStatusMessage;
    path: { performanceId: number };
  };
  "/performances/{performanceId}/get-my-group-holds": {
    command: GetMyGroupHoldsCommand;
    message: GetMyGroupHoldsMessage;
    path: { performanceId: number };
  };
  "/performances/{performanceId}/hold-seats": {
    command: HoldVenueSeatsCommand;
    message: HoldVenueSeatsMessage;
    path: { performanceId: number };
  };
  "/performances/{performanceId}/release-seats": {
    command: ReleaseVenueSeatsCommand;
    message: ReleaseVenueSeatsMessage;
    path: { performanceId: number };
  };
  "/performances/{performanceId}/seat-events": {
    event: PerformanceSeatEvent;
    path: { performanceId: number };
  };
  "/reservation/start-checkout": {
    command: StartCheckoutCommand;
    message: StartCheckoutMessage;
  };
  "/reservation/get-payment-order": {
    command: GetPaymentOrderCommand;
    message: PaymentOrderMessage;
  };
  "/reservation/confirm-payment": {
    command: ConfirmPaymentCommand;
    message: ConfirmPaymentMessage;
  };
  "/reservation/cancel-payment": {
    command: CancelPaymentCommand;
    message: CancelCheckoutMessage;
  };
}

export type PathParams = Record<string, string | number>;

type PathsWith<TKey extends "command" | "message" | "event"> = {
  [TPath in keyof StompPaths]: TKey extends keyof StompPaths[TPath] ? TPath : never;
}[keyof StompPaths];

export type PublishPath = PathsWith<"command">;
export type SubscribePath = PathsWith<"message">;
export type EventPath = PathsWith<"event">;

type WithPathParams<TPath extends keyof StompPaths> = StompPaths[TPath] extends {
  path: infer TParams extends PathParams;
}
  ? { pathParams: TParams }
  : { pathParams?: undefined };

export type StompPublishProps<TPath extends PublishPath> = {
  path: TPath;
  command: StompPaths[TPath] extends { command: infer TCommand } ? TCommand : never;
  headers?: StompHeaders;
} & WithPathParams<TPath>;

export type MessageOf<TPath extends SubscribePath> = StompPaths[TPath] extends { message: infer TMessage } ? TMessage : never;

export type EventOf<TPath extends EventPath> = StompPaths[TPath] extends { event: infer TEvent } ? TEvent : never;

export type StompSubscribeProps<TPath extends SubscribePath> = {
  path: TPath;
  callback: (message: MessageOf<TPath>) => void;
  errorCallback?: (errorMessage: StompFailureMessage) => void;
  headers?: StompHeaders;
} & WithPathParams<TPath>;

export type StompEventSubscribeProps<TPath extends EventPath> = {
  path: TPath;
  callback: (event: EventOf<TPath>) => void;
  errorCallback?: (errorMessage: StompFailureMessage) => void;
  headers?: StompHeaders;
} & WithPathParams<TPath>;
