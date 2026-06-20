"use client";

import { useEffect } from "react";
import { useEditor } from "@/lib/store";

/**
 * Tracks how long the visitor spends and which files they open, then sends a
 * single summary to /api/visit when they leave (once per browser session).
 * The server turns that into an email notification for Vladimir.
 */
export function VisitTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("visit-sent")) return;

    const startedAt = Date.now();
    const perFile: Record<string, number> = {};
    let currentFile = useEditor.getState().activeFile;
    let fileSince = Date.now();

    const flushCurrent = () => {
      if (currentFile) {
        perFile[currentFile] = (perFile[currentFile] ?? 0) + (Date.now() - fileSince);
      }
      fileSince = Date.now();
    };

    const unsub = useEditor.subscribe((s) => {
      if (s.activeFile !== currentFile) {
        flushCurrent();
        currentFile = s.activeFile;
      }
    });

    const send = () => {
      if (sessionStorage.getItem("visit-sent")) return;
      sessionStorage.setItem("visit-sent", "1");
      flushCurrent();
      const payload = {
        durationMs: Date.now() - startedAt,
        files: Object.entries(perFile).map(([file, ms]) => ({ file, ms })),
        referrer: document.referrer || "",
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}×${window.screen.height}`,
        ua: navigator.userAgent.slice(0, 160),
        path: location.pathname,
      };
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/visit", blob);
      } catch {
        /* ignore */
      }
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);

    // fallback: if someone stays very long, send after 5 min so the email isn't lost
    const longStay = setTimeout(send, 5 * 60 * 1000);

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
      clearTimeout(longStay);
    };
  }, []);

  return null;
}
