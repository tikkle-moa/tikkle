import { act, renderHook } from "@testing-library/react";

import { useResizeTextarea } from "@shared/model/use-resize-textarea";

describe("useResizeTextarea", () => {
  it("textarea가 연결되지 않았으면 크기 변경을 건너뛴다", () => {
    const { result } = renderHook(() => useResizeTextarea({ value: null }));

    expect(() => result.current.resizeTextarea()).not.toThrow();
    expect(result.current.textareaRef.current).toBeNull();
  });

  it("textarea 높이를 초기화한 뒤 scrollHeight에 맞춘다", () => {
    const { result } = renderHook(() => useResizeTextarea({ value: "설명" }));
    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 144 });
    result.current.textareaRef.current = textarea;

    act(() => result.current.resizeTextarea());

    expect(textarea.style.height).toBe("144px");
  });

  it("value가 변경되면 연결된 textarea의 높이를 다시 계산한다", () => {
    const { result, rerender } = renderHook(({ value }) => useResizeTextarea({ value }), { initialProps: { value: "첫 설명" } });
    const textarea = document.createElement("textarea");
    let scrollHeight = 80;
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, get: () => scrollHeight });
    result.current.textareaRef.current = textarea;

    scrollHeight = 160;
    rerender({ value: "길어진 설명" });

    expect(textarea.style.height).toBe("160px");
  });
});
