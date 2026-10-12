import type {
  BeginCheckoutReviewCommand,
  BeginCheckoutReviewMessage,
  CancelCheckoutMessage,
  CancelPaymentCommand,
  ConfirmPaymentCommand,
  ConfirmPaymentMessage,
  EndCheckoutReviewCommand,
  EndCheckoutReviewMessage,
  GetPaymentOrderCommand,
  GroupChatCommand,
  GroupChatEvent,
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
  "/groups/chat": {
    command: GroupChatCommand;
  };
  "/groups/{groupId}/chat": {
    event: GroupChatEvent;
    path: { groupId: number };
    headers: { event: { performanceId: number } };
  };
  "/performances/{performanceId}/get-seat-status": {
    command: PerformanceSeatStatusCommand;
    message: PerformanceSeatStatusMessage;
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
  "/reservation/begin-checkout-review": {
    command: BeginCheckoutReviewCommand;
    message: BeginCheckoutReviewMessage;
  };
  "/reservation/end-checkout-review": {
    command: EndCheckoutReviewCommand;
    message: EndCheckoutReviewMessage;
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

type StompKind = "command" | "message" | "event";

export type PathParams = Record<string, string | number>;
export type HeaderParams = Record<string, string | number>;

type WithPathParams<TPath extends keyof StompPaths> = StompPaths[TPath] extends {
  path: infer TParams extends PathParams;
}
  ? { pathParams: TParams }
  : { pathParams?: undefined };

type WithHeaderParams<TPath extends keyof StompPaths, TKind extends StompKind> = StompPaths[TPath] extends {
  headers: { [K in TKind]: infer TParams extends HeaderParams };
}
  ? { headerParams: TParams }
  : { headerParams?: undefined };

type PathsWith<TKind extends StompKind> = {
  [TPath in keyof StompPaths]: TKind extends keyof StompPaths[TPath] ? TPath : never;
}[keyof StompPaths];

export type PublishPath = PathsWith<"command">;
export type SubscribePath = PathsWith<"message">;
export type EventPath = PathsWith<"event">;

type CommandOf<TPath extends PublishPath> = StompPaths[TPath] extends { command: infer TCommand } ? TCommand : never;

type MessageOf<TPath extends SubscribePath> = StompPaths[TPath] extends { message: infer TMessage } ? TMessage : never;

type EventOf<TPath extends EventPath> = StompPaths[TPath] extends { event: infer TEvent } ? TEvent : never;

export type StompPublishProps<TPath extends PublishPath> = {
  path: TPath;
  command: CommandOf<TPath>;
} & WithPathParams<TPath> &
  WithHeaderParams<TPath, "command">;

export type StompSubscribeProps<TPath extends SubscribePath> = {
  path: TPath;
  callback: (message: MessageOf<TPath>) => void;
  errorCallback?: (errorMessage: StompFailureMessage) => void;
} & WithPathParams<TPath> &
  WithHeaderParams<TPath, "message">;

export type StompEventSubscribeProps<TPath extends EventPath> = {
  path: TPath;
  callback: (event: EventOf<TPath>) => void;
  errorCallback?: (errorMessage: StompFailureMessage) => void;
} & WithPathParams<TPath> &
  WithHeaderParams<TPath, "event">;
