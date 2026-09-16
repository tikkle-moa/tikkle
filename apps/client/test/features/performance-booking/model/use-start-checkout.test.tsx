import type { Client } from "@stomp/stompjs";
import { act, renderHook } from "@testing-library/react";

import { useStompStore } from "@shared/realtime/stomp.store";

import { useStartCheckout } from "@features/performance-booking/model/use-start-checkout";

const subscriptions = vi.hoisted(() => new Map<string, (message: { body: string }) => void>());

vi.mock("@shared/realtime/use-stomp-subscription", () => ({
  useStompSubscription: ({ destination, onMessage }: { destination: string; onMessage: (message: { body: string }) => void }) => {
    subscriptions.set(destination, onMessage);
  },
}));

describe("useStartCheckout", () => {
  const publish = vi.fn();
  const client = { connected: true, publish } as unknown as Client;

  beforeEach(() => {
    publish.mockReset();
    subscriptions.clear();
    useStompStore.setState({ client, connectionStatus: "connected" });
  });

  afterEach(() => {
    act(() => {
      useStompStore.setState({ client: null, connectionStatus: "disconnected" });
    });
  });

  it("공연 ID로 START_CHECKOUT을 전송하고 예약 ID를 전달한다", () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, onSuccess }));

    act(() => result.current.startCheckout());
    expect(result.current.isStarting).toBe(true);
    act(() => result.current.startCheckout());

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "/api/reservation/start-checkout",
        body: expect.not.stringContaining('"action"'),
      }),
    );
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;
    expect(JSON.parse(publish.mock.calls[0][0].body).data).toEqual({ performanceId: 10 });
    act(() => {
      subscriptions.get("/user/queue/reservation/start-checkout")?.({
        body: JSON.stringify({
          requestId,
          success: true,
          data: {
            reservationId: 501,
            orderId: "order-501",
            orderName: "Tikkle Live",
            amount: 150_000,
            paymentExpiresAt: "2026-09-15T13:00:00",
          },
        }),
      });
    });

    expect(result.current.isStarting).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith(501);
  });

  it("결제 준비 실패 응답은 서버 오류 메시지를 표시한다", () => {
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;

    act(() => {
      subscriptions.get("/user/queue/reservation/start-checkout")?.({
        body: JSON.stringify({
          requestId,
          success: false,
          error: { code: "CONFLICT", message: "좌석 점유가 만료되었습니다." },
        }),
      });
    });

    expect(result.current.isStarting).toBe(false);
    expect(result.current.errorMessage).toBe("좌석 점유가 만료되었습니다.");
  });

  it("예약 ID가 없는 성공 응답은 기본 오류로 처리한다", () => {
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    const requestId = JSON.parse(publish.mock.calls[0][0].body).requestId as string;
    act(() => {
      subscriptions.get("/user/queue/reservation/start-checkout")?.({
        body: JSON.stringify({ requestId, success: true, data: {} }),
      });
    });

    expect(result.current.errorMessage).toBe("결제 준비를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("잘못된 응답 본문과 다른 요청 응답은 무시한다", () => {
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());
    act(() => {
      subscriptions.get("/user/queue/reservation/start-checkout")?.({ body: "not-json" });
      subscriptions.get("/user/queue/reservation/start-checkout")?.({
        body: JSON.stringify({ requestId: "another-request", success: false, error: { message: "무시" } }),
      });
    });

    expect(result.current.isStarting).toBe(true);
    expect(result.current.errorMessage).toBeNull();
  });

  it("STOMP가 연결되지 않았으면 요청 대신 연결 오류를 표시한다", () => {
    const disconnectedClient = { connected: false, publish } as unknown as Client;
    useStompStore.setState({ client: disconnectedClient, connectionStatus: "disconnected" });
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, onSuccess: vi.fn() }));

    act(() => result.current.startCheckout());

    expect(publish).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe("서버 연결 후 다시 시도해 주세요.");
  });

  it("비활성화된 checkout은 STOMP 요청을 보내지 않는다", () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useStartCheckout({ performanceId: 10, onSuccess, enabled: false }));

    act(() => result.current.startCheckout());

    expect(publish).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.isStarting).toBe(false);
  });
});
