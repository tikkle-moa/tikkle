import type { Client, IMessage } from "@stomp/stompjs";
import { act, renderHook } from "@testing-library/react";

import { useStompStore } from "@shared/realtime/stomp.store";
import { useStompSubscription } from "@shared/realtime/use-stomp-subscription";

describe("useStompSubscription", () => {
  afterEach(() => {
    useStompStore.setState({
      client: null,
      connectionStatus: "disconnected",
    });
  });

  it("Client가 교체되면 기존 구독을 해제하고 새 Client에 다시 구독한다", () => {
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();

    const firstSubscribe = vi.fn().mockReturnValue({
      unsubscribe: firstUnsubscribe,
    });

    const secondSubscribe = vi.fn().mockReturnValue({
      unsubscribe: secondUnsubscribe,
    });

    const firstClient = {
      connected: true,
      subscribe: firstSubscribe,
    } as unknown as Client;

    const secondClient = {
      connected: true,
      subscribe: secondSubscribe,
    } as unknown as Client;

    const onMessage = vi.fn();

    useStompStore.setState({
      client: firstClient,
      connectionStatus: "connected",
    });

    const { unmount } = renderHook(() =>
      useStompSubscription({
        destination: "/user/queue/reservation",
        onMessage,
      }),
    );

    expect(firstSubscribe).toHaveBeenCalledWith("/user/queue/reservation", expect.any(Function), undefined);

    act(() => {
      useStompStore.setState({
        client: secondClient,
        connectionStatus: "connecting",
      });
    });

    expect(firstUnsubscribe).toHaveBeenCalledOnce();
    expect(secondSubscribe).not.toHaveBeenCalled();

    act(() => {
      useStompStore.setState({
        client: secondClient,
        connectionStatus: "connected",
      });
    });

    expect(secondSubscribe).toHaveBeenCalledWith("/user/queue/reservation", expect.any(Function), undefined);

    unmount();

    expect(secondUnsubscribe).toHaveBeenCalledOnce();
  });

  it("메시지는 가장 최근 onMessage 콜백으로 전달한다", () => {
    let subscribedCallback!: (message: IMessage) => void;

    const subscribe = vi.fn().mockImplementation((_destination: string, callback: (message: IMessage) => void) => {
      subscribedCallback = callback;

      return {
        unsubscribe: vi.fn(),
      };
    });

    const client = {
      connected: true,
      subscribe,
    } as unknown as Client;

    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    useStompStore.setState({
      client,
      connectionStatus: "connected",
    });

    const { rerender } = renderHook(
      ({ onMessage }) =>
        useStompSubscription({
          destination: "/user/queue/reservation",
          onMessage,
        }),
      {
        initialProps: {
          onMessage: firstHandler,
        },
      },
    );

    rerender({ onMessage: secondHandler });

    const message = {} as IMessage;

    act(() => {
      subscribedCallback(message);
    });

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith(message);
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("비활성화 상태에서는 구독하지 않고 활성화되면 구독한다", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn().mockReturnValue({ unsubscribe });

    const client = {
      connected: true,
      subscribe,
    } as unknown as Client;

    useStompStore.setState({
      client,
      connectionStatus: "connected",
    });

    const { rerender, unmount } = renderHook(
      ({ enabled }) =>
        useStompSubscription({
          destination: "/user/queue/reservation",
          onMessage: vi.fn(),
          enabled,
        }),
      {
        initialProps: {
          enabled: false,
        },
      },
    );

    expect(subscribe).not.toHaveBeenCalled();

    rerender({ enabled: true });

    expect(subscribe).toHaveBeenCalledOnce();

    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
