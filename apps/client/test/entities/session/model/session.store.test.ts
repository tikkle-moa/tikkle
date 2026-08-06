import { useSessionStore } from "@/entities/session/model/session.store";
import type { User } from "@/entities/session/model/session.types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_USER: User = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

const createResponse = (status: number, body?: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

const fetchMock = vi.fn<typeof fetch>();

describe("useSessionStore", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);

    useSessionStore.setState({
      user: null,
      status: "idle",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("초기 상태는 로그인 여부를 확인하지 않은 상태다", () => {
    expect(useSessionStore.getState()).toMatchObject({
      user: null,
      status: "idle",
    });
  });

  it("/auth/me 성공 시 로그인 사용자를 저장한다", async () => {
    fetchMock.mockResolvedValue(
      createResponse(200, {
        success: true,
        data: TEST_USER,
      }),
    );

    await useSessionStore.getState().initialize();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", {
      credentials: "include",
    });

    expect(useSessionStore.getState()).toMatchObject({
      user: TEST_USER,
      status: "authenticated",
    });
  });

  it("/auth/me가 401이면 비로그인 상태로 변경한다", async () => {
    fetchMock.mockResolvedValue(createResponse(401));

    await useSessionStore.getState().initialize();

    expect(useSessionStore.getState()).toMatchObject({
      user: null,
      status: "unauthenticated",
    });
  });

  it("서버 오류가 발생해도 기존 사용자를 유지한다", async () => {
    useSessionStore.setState({
      user: TEST_USER,
      status: "authenticated",
    });

    fetchMock.mockResolvedValue(createResponse(500));

    await useSessionStore.getState().initialize();

    expect(useSessionStore.getState()).toMatchObject({
      user: TEST_USER,
      status: "authenticated",
    });
  });

  it("기존 사용자가 없을 때 서버 오류가 발생하면 error 상태로 변경한다", async () => {
    fetchMock.mockResolvedValue(createResponse(500));

    await useSessionStore.getState().initialize();

    expect(useSessionStore.getState()).toMatchObject({
      user: null,
      status: "error",
    });
  });

  it("네트워크 오류가 발생하면 error 상태로 변경한다", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    await useSessionStore.getState().initialize();

    expect(useSessionStore.getState()).toMatchObject({
      user: null,
      status: "error",
    });
  });

  it("이미 확인 중이면 요청을 중복 실행하지 않는다", async () => {
    useSessionStore.setState({
      status: "loading",
    });

    await useSessionStore.getState().initialize();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("세션을 초기화한다", () => {
    useSessionStore.setState({
      user: TEST_USER,
      status: "authenticated",
    });

    useSessionStore.getState().clearSession();

    expect(useSessionStore.getState()).toMatchObject({
      user: null,
      status: "unauthenticated",
    });
  });
});
