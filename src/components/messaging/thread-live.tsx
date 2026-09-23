"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Refreshes the server-rendered thread every `intervalMs` while the tab is visible (and once when it becomes
 * visible again), so new messages appear without a socket.
 */
export function ThreadPoller({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  return null;
}

/**
 * Scroll container for the message list: jumps to the bottom on first render and whenever a new last message
 * arrives; when earlier messages are prepended it keeps the previously first message in view instead.
 */
export function ThreadScroller({ firstMessageId, lastMessageId, className, children }: { firstMessageId: string | null; lastMessageId: string | null; className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const prev = React.useRef<{ first: string | null; last: string | null } | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const before = prev.current;
    prev.current = { first: firstMessageId, last: lastMessageId };
    if (!before || before.last !== lastMessageId) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (before.first && before.first !== firstMessageId) {
      const anchor = el.querySelector<HTMLElement>(`[data-message-id="${before.first}"]`);
      // The container is positioned, so offsetTop is relative to it.
      if (anchor) el.scrollTop = anchor.offsetTop - 8;
    }
  }, [firstMessageId, lastMessageId]);
  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      {children}
    </div>
  );
}
