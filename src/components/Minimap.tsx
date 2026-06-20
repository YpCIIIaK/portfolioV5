"use client";

import { useEditor } from "@/lib/store";
import type { Block } from "@/lib/types";

/** Decorative VSCode-style minimap: tiny abstract preview of the file content. */
export function Minimap({ blocks }: { blocks: Block[] }) {
  const open = useEditor((s) => s.minimapOpen);
  if (!open) return null;

  return (
    <div className="hidden w-16 shrink-0 overflow-hidden border-l border-vsc-line bg-vsc-bg py-3 lg:block">
      <div className="flex flex-col gap-[3px] px-2 opacity-60">
        {blocks.flatMap((b, i) => rowsFor(b).map((r, j) => (
          <div
            key={`${i}-${j}`}
            className="h-[3px] rounded-sm"
            style={{ width: `${r.w}%`, background: r.c }}
          />
        )))}
      </div>
    </div>
  );
}

function rowsFor(b: Block): { w: number; c: string }[] {
  const muted = "#3a3a3a";
  const bright = "#6a6a6a";
  const accent = "#3d5a73";
  const green = "#2f4f47";
  switch (b.t) {
    case "h1":
      return [{ w: 70, c: bright }, { w: 0, c: muted }];
    case "h2":
      return [{ w: 55, c: bright }];
    case "h3":
      return [{ w: 45, c: accent }];
    case "p":
      return [80, 95, 60].map((w) => ({ w, c: muted }));
    case "ul":
      return b.items.map(() => ({ w: 70, c: muted }));
    case "code":
      return Array.from({ length: Math.min(10, b.code.split("\n").length) }, (_, i) => ({
        w: 40 + ((i * 17) % 55),
        c: green,
      }));
    case "metrics":
    case "tech":
      return [{ w: 90, c: accent }];
    case "callout":
      return [{ w: 85, c: accent }, { w: 70, c: accent }];
    case "links":
      return [{ w: 50, c: accent }];
    default:
      return [{ w: 0, c: muted }];
  }
}
