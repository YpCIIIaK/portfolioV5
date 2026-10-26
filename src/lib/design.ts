"use client";

import { useSyncExternalStore } from "react";
import { isReplayMode } from "./replay";

/** Which look the visitor chose: the VS Code IDE or the 6.0 showcase. null = not asked yet. */
export type Design = "ide" | "v6";

const KEY = "portfolio-design";
const listeners = new Set<() => void>();

function read(): Design | null {
  // The replay player starts in the IDE and switches only when the recording says so.
  if (isReplayMode()) return "ide";
  try {
    const v = localStorage.getItem(KEY);
    return v === "ide" || v === "v6" ? v : null;
  } catch {
    return null;
  }
}

let current: Design | null | undefined;

/** `persist: false` is for the replay player, which must not touch the owner's own choice. */
export function setDesign(d: Design, { persist = true } = {}) {
  current = d;
  if (persist) {
    try {
      localStorage.setItem(KEY, d);
    } catch {
      /* storage blocked: keep for this page */
    }
  }
  listeners.forEach((l) => l());
}

export function getDesign(): Design | null {
  if (current === undefined) current = read();
  return current;
}

export function subscribeDesign(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** "pending" on the server and before hydration, then the stored choice (or null). */
export function useDesign(): Design | null | "pending" {
  return useSyncExternalStore(
    subscribeDesign,
    getDesign,
    () => "pending",
  );
}
