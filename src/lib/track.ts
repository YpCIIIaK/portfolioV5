/** Fire-and-forget event for the visit summary (picked up by VisitTracker). */
export function track(event: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("portfolio-track", { detail: event.slice(0, 80) }));
}
