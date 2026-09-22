import { act, renderHook } from "@testing-library/react";
import type { BeginCheckoutReviewMessage, EndCheckoutReviewMessage, StompFailureMessage } from "@tikkle/api-types";

import type StompClient from "@shared/realtime/stomp-client";
import { useStompStore } from "@shared/realtime/stomp.store";

import { useCheckoutReview } from "@features/performance-booking/model/use-checkout-review";

describe("useCheckoutReview", () => {
  const publish = vi.fn();
  const subscribe = vi.fn();
  const unsubscribe = vi.fn();
  const stompClient = { publish, subscribe } as unknown as StompClient;
  const review = {
    groupId: "1:10",
    performanceId: 10,
    venueSeatIds: [101, 102],
    expiresAt: "2026-09-22T13:00:00",
  };
  let handleBeginMessage: ((message: BeginCheckoutReviewMessage) => void) | undefined;
  let handleBeginError: ((message: StompFailureMessage) => void) | undefined;
  let handleEndMessage: ((message: EndCheckoutReviewMessage) => void) | undefined;
  let handleEndError: ((message: StompFailureMessage) => void) | undefined;

  beforeEach(() => {
    publish.mockReset();
    subscribe.mockReset();
    unsubscribe.mockReset();
    handleBeginMessage = undefined;
    handleBeginError = undefined;
    handleEndMessage = undefined;
    handleEndError = undefined;
    subscribe.mockImplementation(({ path, callback, errorCallback }) => {
      if (path === "/reservation/begin-checkout-review") {
        handleBeginMessage = callback;
        handleBeginError = errorCallback;
      } else {
        handleEndMessage = callback;
        handleEndError = errorCallback;
      }
      return { unsubscribe };
    });
    useStompStore.setState({ stompClient, connectionStatus: "connected" });
  });

  afterEach(() => {
    act(() => useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" }));
    vi.useRealTimers();
  });

  it("BEGIN 응답의 서버 좌석 스냅샷을 전달하고 중복 응답은 무시한다", () => {
    const onBeginSuccess = vi.fn();
    const { result } = renderHook(() => useCheckoutReview({ performanceId: 10, onBeginSuccess }));

    act(() => result.current.beginReview());
    const command = publish.mock.calls[0][0];
    expect(command).toMatchObject({
      path: "/reservation/begin-checkout-review",
      command: { requestId: expect.any(String), data: { performanceId: 10, reviewToken: expect.any(String) } },
    });
    expect(result.current.isBeginning).toBe(true);
    act(() => result.current.beginReview());
    act(() => result.current.endReview(command.command.data.reviewToken));
    expect(publish).toHaveBeenCalledTimes(1);

    act(() => {
      handleBeginMessage?.({ requestId: "another-request", success: true, data: { ...review, reviewToken: command.command.data.reviewToken } });
    });
    expect(result.current.isBeginning).toBe(true);

    const message = {
      requestId: command.command.requestId,
      success: true as const,
      data: { ...review, reviewToken: command.command.data.reviewToken },
    };
    act(() => {
      handleBeginMessage?.(message);
      handleBeginMessage?.(message);
    });

    expect(result.current.isBeginning).toBe(false);
    expect(onBeginSuccess).toHaveBeenCalledTimes(1);
    expect(onBeginSuccess).toHaveBeenCalledWith(message.data);
  });

  it("BEGIN 응답 유실 시 같은 토큰으로 자동 재전송하고 타임아웃 뒤 수동 재시도에도 토큰을 유지한다", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCheckoutReview({ performanceId: 10 }));

    act(() => result.current.beginReview());
    const firstCommand = publish.mock.calls[0][0].command;
    act(() => vi.advanceTimersByTime(8_000));

    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[1][0].command).toEqual(firstCommand);
    expect(result.current.isBeginning).toBe(true);

    act(() => vi.advanceTimersByTime(8_000));
    expect(result.current.isBeginning).toBe(false);
    expect(result.current.errorMessage).toBe("예매 정보 확인 결과를 확인하지 못했습니다. 다시 시도해 주세요.");

    act(() => result.current.beginReview());
    const retriedCommand = publish.mock.calls[2][0].command;
    expect(retriedCommand.requestId).not.toBe(firstCommand.requestId);
    expect(retriedCommand.data.reviewToken).toBe(firstCommand.data.reviewToken);
  });

  it("BEGIN 오류와 서버 스냅샷 불일치를 표시한다", () => {
    const onBeginSuccess = vi.fn();
    const { result } = renderHook(() => useCheckoutReview({ performanceId: 10, onBeginSuccess }));

    act(() => result.current.beginReview());
    const command = publish.mock.calls[0][0].command;
    act(() => {
      handleBeginMessage?.({
        requestId: command.requestId,
        success: true,
        data: { ...review, reviewToken: "another-token" },
      });
    });
    expect(result.current.errorMessage).toBe("예매 정보 확인을 시작하지 못했습니다. 다시 시도해 주세요.");
    expect(onBeginSuccess).not.toHaveBeenCalled();

    act(() => result.current.beginReview());
    const nextRequestId = publish.mock.calls[1][0].command.requestId as string;
    act(() => {
      handleBeginError?.({ requestId: nextRequestId, success: false, error: { code: "CONFLICT", message: "다른 탭에서 확인 중입니다." } });
    });
    expect(result.current.errorMessage).toBe("다른 탭에서 확인 중입니다.");
  });

  it("END에 토큰을 전달하고 성공 시 완료 콜백을 호출한다", () => {
    const onEndSuccess = vi.fn();
    const { result } = renderHook(() => useCheckoutReview({ performanceId: 10, onEndSuccess }));

    act(() => result.current.endReview("review-token"));
    const command = publish.mock.calls[0][0];
    expect(command).toMatchObject({
      path: "/reservation/end-checkout-review",
      command: { requestId: expect.any(String), data: { performanceId: 10, reviewToken: "review-token" } },
    });
    expect(result.current.isEnding).toBe(true);

    act(() => handleEndMessage?.({ requestId: command.command.requestId, success: true, data: { performanceId: 10 } }));

    expect(result.current.isEnding).toBe(false);
    expect(onEndSuccess).toHaveBeenCalledTimes(1);
  });

  it("END 응답 유실도 같은 토큰으로 재전송하고 최종 타임아웃을 표시한다", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCheckoutReview({ performanceId: 10 }));

    act(() => result.current.endReview("review-token"));
    const command = publish.mock.calls[0][0].command;
    act(() => vi.advanceTimersByTime(16_000));

    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[1][0].command).toEqual(command);
    expect(result.current.isEnding).toBe(false);
    expect(result.current.errorMessage).toBe("좌석 선택 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
  });

  it("END 오류를 표시하고 연결되지 않으면 BEGIN과 END를 전송하지 않는다", () => {
    const { result } = renderHook(() => useCheckoutReview({ performanceId: 10 }));

    act(() => result.current.endReview("review-token"));
    const requestId = publish.mock.calls[0][0].command.requestId as string;
    act(() => {
      handleEndError?.({ requestId, success: false, error: { code: "CONFLICT", message: "결제 대기 중입니다." } });
    });
    expect(result.current.errorMessage).toBe("결제 대기 중입니다.");

    act(() => useStompStore.setState({ stompClient: null, connectionStatus: "disconnected" }));
    act(() => result.current.beginReview());
    act(() => result.current.endReview("review-token"));
    expect(publish).toHaveBeenCalledTimes(1);
    expect(result.current.errorMessage).toBe("서버 연결 후 다시 시도해 주세요.");
  });

  it("언마운트 시 구독과 응답 대기 타이머를 정리한다", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useCheckoutReview({ performanceId: 10 }));

    act(() => result.current.beginReview());
    unmount();
    act(() => vi.advanceTimersByTime(16_000));

    expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
