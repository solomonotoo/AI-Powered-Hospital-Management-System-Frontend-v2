import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIdleTimeout } from "./use-idle-timeout";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useIdleTimeout", () => {
  it("calls onIdle after the timeout", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, 1_000));

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("restarts the timer after workstation activity", () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimeout(onIdle, 1_000));

    act(() => {
      vi.advanceTimersByTime(900);
    });
    act(() => {
      window.dispatchEvent(new Event("mousedown"));
    });
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("uses the latest callback without restarting the timer", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ callback }) => useIdleTimeout(callback, 1_000),
      { initialProps: { callback: first } },
    );

    rerender({ callback: second });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("clears the timer on unmount", () => {
    const onIdle = vi.fn();
    const { unmount } = renderHook(() => useIdleTimeout(onIdle, 1_000));

    unmount();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(onIdle).not.toHaveBeenCalled();
  });
});
