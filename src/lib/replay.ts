/**
 * Session replay: a lightweight, self-made alternative to Hotjar. Instead of
 * video we record a stream of small events (pointer position, clicks, scroll,
 * opened files, resizes) and play them back over a live copy of the site.
 */

/** One recorded event. `t` is milliseconds since the session started. */
export type ReplayEvent =
  | { t: number; k: "m"; x: number; y: number } // pointer move
  | { t: number; k: "c"; x: number; y: number; l?: string } // click (+ short label of the target)
  | { t: number; k: "s"; r: number } // editor scroll, 0..1
  | { t: number; k: "f"; id: string } // opened file
  | { t: number; k: "w"; w: number; h: number } // viewport size
  | { t: number; k: "v"; on: boolean } // tab visible / hidden
  | { t: number; k: "i"; n: number; l?: string }; // typing: number of keys (text itself is masked)

export interface ReplayMeta {
  ua: string;
  w: number;
  h: number;
  file: string;
  ref?: string;
  lang?: string;
  tz?: string;
}

/** The player loads the site with ?replay=1: no recording, banner or notifications there. */
export function isReplayMode(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(location.search).has("replay");
}

/** Per-tab session id shared by the recorder and the visit notification. */
export function replaySessionId(): string {
  let id = sessionStorage.getItem("replay-id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("replay-id", id);
  }
  return id;
}

export const REPLAY_LIMITS = {
  maxEventsPerChunk: 2000,
  maxChunks: 120, // ~20 min at one chunk per 10 s
  flushMs: 10_000,
  moveSampleMs: 100,
};
