"use client";

import { useEffect } from "react";
import { useEditor } from "@/lib/store";
import { getDesign, subscribeDesign } from "@/lib/design";
import { isReplayMode, replaySessionId, REPLAY_LIMITS, type ReplayEvent } from "@/lib/replay";

/** Short, readable label for a clicked element (link text, button title…). */
function labelOf(el: Element | null): string | undefined {
  const target = el?.closest("a,button,[role=button],[title],li,h1,h2,h3");
  if (!target) return undefined;
  const text = (target.getAttribute("title") || target.getAttribute("aria-label") || target.textContent || "").trim();
  return text.replace(/\s+/g, " ").slice(0, 60) || undefined;
}

/**
 * Records the visit as a compact event stream and uploads it in chunks to
 * /api/replay. Typed text is never stored — only how many keys were pressed.
 */
export function SessionRecorder() {
  useEffect(() => {
    if (typeof window === "undefined" || isReplayMode()) return;

    const id = replaySessionId();
    const startedAt = Number(sessionStorage.getItem("replay-start")) || Date.now();
    sessionStorage.setItem("replay-start", String(startedAt));
    let seq = Number(sessionStorage.getItem("replay-seq") ?? "0");
    let buffer: ReplayEvent[] = [];
    let stopped = seq >= REPLAY_LIMITS.maxChunks;
    const now = () => Date.now() - startedAt;
    const push = (e: ReplayEvent) => {
      if (!stopped && buffer.length < REPLAY_LIMITS.maxEventsPerChunk) buffer.push(e);
    };

    const flush = (beacon = false) => {
      if (stopped || buffer.length === 0) return;
      const body = JSON.stringify({
        id,
        seq,
        events: buffer,
        meta:
          seq === 0
            ? {
                ua: navigator.userAgent.slice(0, 300),
                w: window.innerWidth,
                h: window.innerHeight,
                file: useEditor.getState().activeFile ?? "",
                ref: new URLSearchParams(location.search).get("s") ?? new URLSearchParams(location.search).get("ref") ?? undefined,
                lang: navigator.language,
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }
            : undefined,
      });
      buffer = [];
      seq++;
      sessionStorage.setItem("replay-seq", String(seq));
      if (seq >= REPLAY_LIMITS.maxChunks) stopped = true;
      try {
        if (beacon) navigator.sendBeacon("/api/replay", new Blob([body], { type: "application/json" }));
        else void fetch("/api/replay", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
      } catch {
        /* ignore */
      }
    };

    push({ t: now(), k: "w", w: window.innerWidth, h: window.innerHeight });
    let design = getDesign();
    if (design) push({ t: now(), k: "d", d: design });
    const unsubDesign = subscribeDesign(() => {
      const d = getDesign();
      if (d && d !== design) push({ t: now(), k: "d", d });
      design = d;
    });
    const initial = useEditor.getState().activeFile;
    if (initial) push({ t: now(), k: "f", id: initial });

    let lastMove = 0;
    const onMove = (e: PointerEvent) => {
      const t = now();
      if (t - lastMove < REPLAY_LIMITS.moveSampleMs) return;
      lastMove = t;
      push({ t, k: "m", x: Math.round(e.clientX), y: Math.round(e.clientY) });
    };
    const onClick = (e: MouseEvent) =>
      push({ t: now(), k: "c", x: Math.round(e.clientX), y: Math.round(e.clientY), l: labelOf(e.target as Element) });
    let lastScroll = 0;
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el?.id !== "editor-scroll" && el?.id !== "v6-scroll") return;
      const t = now();
      if (t - lastScroll < 150) return;
      lastScroll = t;
      const max = el.scrollHeight - el.clientHeight;
      push({ t, k: "s", r: max > 0 ? Math.round((el.scrollTop / max) * 1000) / 1000 : 0 });
    };
    let keys = 0;
    let keyLabel: string | undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length === 1 || e.key === "Backspace") {
        keys++;
        keyLabel = labelOf(e.target as Element) ?? (e.target as HTMLElement)?.getAttribute?.("placeholder") ?? undefined;
      }
    };
    const keyTimer = setInterval(() => {
      if (keys) push({ t: now(), k: "i", n: keys, l: keyLabel?.slice(0, 40) });
      keys = 0;
    }, 1000);
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => push({ t: now(), k: "w", w: window.innerWidth, h: window.innerHeight }), 200);
    };
    const onVisibility = () => {
      push({ t: now(), k: "v", on: document.visibilityState === "visible" });
      if (document.visibilityState === "hidden") flush(true);
    };
    const unsub = useEditor.subscribe((s, prev) => {
      if (s.activeFile && s.activeFile !== prev.activeFile) push({ t: now(), k: "f", id: s.activeFile });
    });
    const onPageHide = () => flush(true);

    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("scroll", onScroll, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    window.addEventListener("pagehide", onPageHide);
    const flushTimer = setInterval(() => flush(), REPLAY_LIMITS.flushMs);

    return () => {
      unsub();
      unsubDesign();
      clearInterval(flushTimer);
      clearInterval(keyTimer);
      clearTimeout(resizeTimer);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
