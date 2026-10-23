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

    // Returning visitor: a random id kept in localStorage (no fingerprinting).
    let visitorId = "";
    let visitNo = 1;
    try {
      visitorId = localStorage.getItem("visitor-id") ?? "";
      if (!visitorId) {
        visitorId = Math.random().toString(36).slice(2, 10);
        localStorage.setItem("visitor-id", visitorId);
      }
      visitNo = Number(localStorage.getItem("visit-count") ?? "0") + 1;
      localStorage.setItem("visit-count", String(visitNo));
    } catch {
      /* storage blocked */
    }

    // Outbound clicks (GitHub, demos, Telegram, CV) and interaction count.
    const clicks: string[] = [];
    let interactions = 0;
    const onClick = (e: MouseEvent) => {
      interactions++;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (href && !href.startsWith("/?file=") && clicks.length < 15) clicks.push(href.slice(0, 120));
    };
    const onKey = () => { interactions++; };
    let maxScroll = 0;
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el?.scrollHeight > el?.clientHeight) {
        maxScroll = Math.max(maxScroll, Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100));
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("scroll", onScroll, true);

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
        ua: navigator.userAgent.slice(0, 300),
        path: location.pathname + location.search,
        lang: navigator.languages?.slice(0, 3).join(", ") || navigator.language,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        touch: navigator.maxTouchPoints > 0,
        webdriver: Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver),
        visitorId,
        visitNo,
        clicks,
        interactions,
        maxScroll,
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
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
      clearTimeout(longStay);
    };
  }, []);

  return null;
}
