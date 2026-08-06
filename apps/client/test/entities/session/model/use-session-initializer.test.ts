import { useSessionInitializer } from "@/app/model/use-session-initializer";
import { useSessionStore } from "@/entities/session";
import { act, renderHook, waitFor } from "@testing-library/react";

const originalInitialize = useSessionStore.getState().initialize;

const initialize = vi.fn<() => Promise<void>>();

describe("useSessionInitializer", () => {
  beforeEach(() => {
    initialize.mockReset();
    initialize.mockResolvedValue(undefined);

    useSessionStore.setState({
      initialize,
    });
  });

  afterEach(() => {
    act(() => {
      useSessionStore.setState({
        initialize: originalInitialize,
      });
    });
  });

  it("마운트되면 로그인 상태를 초기화한다", async () => {
    renderHook(() => useSessionInitializer());

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledTimes(1);
    });
  });
});
