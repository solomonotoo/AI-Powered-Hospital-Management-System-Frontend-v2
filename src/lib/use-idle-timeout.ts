"use client";

import { useEffect, useRef } from "react";
import { env } from "@/lib/env";

// Shared-workstation idle lock: after N minutes without input, lock the
// screen (password re-entry, Slice 2) instead of logging out — wards
// share PCs and clinicians step away mid-chart constantly. Mounted in
// authenticated layouts only; the `onIdle` callback decides lock vs
// logout per policy.
export function useIdleTimeout(onIdle: () => void, timeoutMs: number = env.IDLE_TIMEOUT_MS) {
  const callback = useRef(onIdle);

  useEffect(() => {
    callback.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), timeoutMs);
    };
    const events = ["mousedown", "pointermove", "keydown", "wheel", "scroll", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [timeoutMs]);
}
