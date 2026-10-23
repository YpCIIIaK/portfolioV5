"use client";

import { useEffect } from "react";
import { useEditor } from "@/lib/store";

/**
 * Tracks how long the visitor spends and which files they open, then sends a
 * single summary to /api/visit when they leave (once per browser session).
 * The server turns that into a Telegram / email notification for Vladimir.
 *
 * No fingerprinting: returning visitors are recognised only by a random id in
 * localStorage, and `?ref=` comes from links Vladimir puts into his applications.
 */
export function VisitTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("visit-sent")) return;

    const startedAt = Date.now();
    const params = new URLSearchParams(location.search);

    // Which application link brought them here (?ref=iqoko). Kept for the whole
    // browser so a later direct visit still shows the original company.
    let ref = params.get("ref")?.slice(0, 40) ?? "";
    let firstRef = "";
    try {
      if (ref) localStorage.setItem("first-ref", localStorage.getItem("first-ref") ?? ref);
      firstRef = localStorage.getItem("first-ref") ?? "";
      if (!ref) ref = firstRef;
    } catch {
      /* storage blocked */
    }
    const utm = ["utm_source", "utm_medium", "utm_campaign"]
      .map((k) => params.get(k))
      .filter(Boolean)
      .join(" / ");

    // Returning visitor: a random id kept in localStorage.
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

    // Time per file and the order files were opened.
    const perFile: Record<string, number> = {};
    const route: string[] = [];
    let currentFile = useEditor.getState().activeFile;
    if (currentFile) route.push(currentFile);
    let fileSince = Date.now();
    const flushCurrent = () => {
      if (currentFile) perFile[currentFile] = (perFile[currentFile] ?? 0) + (Date.now() - fileSince);
      fileSince = Date.now();
    };
    const unsub = useEditor.subscribe((s) => {
      if (s.activeFile !== currentFile) {
        flushCurrent();
        currentFile = s.activeFile;
        if (currentFile && route[route.length - 1] !== currentFile && route.length < 30) route.push(currentFile);
      }
    });

    // Key actions: outbound links, CV, contacts, terminal and palette (via track()).
    const actions: string[] = [];
    const addAction = (a: string) => {
      if (actions.length < 20 && !actions.includes(a)) actions.push(a);
    };
    const describeLink = (href: string) => {
      if (href.startsWith("/cv")) return "⭐ открыл PDF-резюме";
      if (href.includes("t.me/")) return "⭐ нажал Telegram";
      if (href.startsWith("mailto:")) return "⭐ нажал email";
      if (href.includes("github.com")) return `GitHub: ${href.replace(/^https?:\/\/github\.com\//, "")}`;
      return `ссылка: ${href.replace(/^https?:\/\//, "").slice(0, 80)}`;
    };

    // Active time: visible tab + some input in the last 30 s.
    let interactions = 0;
    let firstActionMs = 0;
    let lastInput = Date.now();
    let activeMs = 0;
    let tick = Date.now();
    const bump = () => {
      interactions++;
      if (!firstActionMs) firstActionMs = Date.now() - startedAt;
      lastInput = Date.now();
    };
    const onMove = () => {
      lastInput = Date.now();
    };
    const activeTimer = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible" && now - lastInput < 30_000) activeMs += now - tick;
      tick = now;
    }, 1000);

    const onClick = (e: MouseEvent) => {
      bump();
      const href = (e.target as HTMLElement | null)?.closest?.("a")?.getAttribute("href");
      if (href && !href.startsWith("/?file=")) addAction(describeLink(href));
    };
    const onTrack = (e: Event) => addAction((e as CustomEvent<string>).detail);
    let maxScroll = 0;
    const onScroll = (e: Event) => {
      lastInput = Date.now();
      const el = e.target as HTMLElement;
      if (el?.scrollHeight > el?.clientHeight) {
        maxScroll = Math.max(maxScroll, Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100));
      }
    };

    // Client errors, so a broken page on someone's device doesn't go unnoticed.
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => {
      if (errors.length < 3) errors.push(`${e.message}`.slice(0, 160));
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (errors.length < 3) errors.push(`promise: ${String(e.reason).slice(0, 150)}`);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", bump, true);
    document.addEventListener("pointermove", onMove, { capture: true, passive: true });
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("portfolio-track", onTrack);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    const send = () => {
      if (sessionStorage.getItem("visit-sent")) return;
      sessionStorage.setItem("visit-sent", "1");
      flushCurrent();
      const conn = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string; downlink?: number } }).connection;
      const payload = {
        durationMs: Date.now() - startedAt,
        activeMs,
        firstActionMs,
        files: Object.entries(perFile).map(([file, ms]) => ({ file, ms })),
        route,
        actions,
        errors,
        ref,
        firstRef: firstRef && firstRef !== ref ? firstRef : "",
        utm,
        referrer: document.referrer || "",
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}×${window.screen.height}`,
        dpr: window.devicePixelRatio,
        dark: window.matchMedia?.("(prefers-color-scheme: dark)").matches,
        net: conn ? [conn.type, conn.effectiveType, conn.downlink ? `${conn.downlink} Мбит/с` : ""].filter(Boolean).join(", ") : "",
        ua: navigator.userAgent.slice(0, 300),
        path: location.pathname + location.search,
        lang: navigator.languages?.slice(0, 3).join(", ") || navigator.language,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        touch: navigator.maxTouchPoints > 0,
        webdriver: Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver),
        visitorId,
        visitNo,
        interactions,
        maxScroll,
      };
      try {
        navigator.sendBeacon("/api/visit", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      } catch {
        /* ignore */
      }
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);

    // fallback: if someone stays very long, send after 5 min so the notification isn't lost
    const longStay = setTimeout(send, 5 * 60 * 1000);

    return () => {
      unsub();
      clearInterval(activeTimer);
      clearTimeout(longStay);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", bump, true);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("portfolio-track", onTrack);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
    };
  }, []);

  return null;
}
