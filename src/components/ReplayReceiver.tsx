"use client";

import { useEffect } from "react";
import { useEditor } from "@/lib/store";
import { fileById } from "@/lib/files";
import { isReplayMode } from "@/lib/replay";
import { setDesign } from "@/lib/design";

/**
 * Inside the replay player the site runs in an iframe with ?replay=1. The player
 * (same origin) drives it with postMessage: open a file, scroll, switch the design.
 */
export function ReplayReceiver() {
  useEffect(() => {
    if (!isReplayMode()) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || typeof e.data !== "object" || !e.data) return;
      const msg = e.data as { type?: string; id?: string; r?: number; d?: string };
      if (msg.type === "replay-open" && msg.id && fileById(msg.id)) {
        useEditor.getState().openFile(msg.id);
      } else if (msg.type === "replay-design" && (msg.d === "ide" || msg.d === "v6")) {
        setDesign(msg.d, { persist: false });
      } else if (msg.type === "replay-scroll" && typeof msg.r === "number") {
        const el = document.getElementById("v6-scroll") ?? document.getElementById("editor-scroll");
        if (el) el.scrollTop = msg.r * (el.scrollHeight - el.clientHeight);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return null;
}
