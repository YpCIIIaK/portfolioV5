"use client";

/**
 * Shared visual language for the workspace: a priority scale and a small
 * customisation palette, plus the pickers that let owners set them. Keeping it
 * in one place means tasks, events and notes stay consistent.
 */

import { useEffect, useRef, useState } from "react";
import { Flag, Palette, Check } from "lucide-react";
import type { Priority } from "@/lib/workspace";

export interface PriorityMeta {
  key: Priority;
  label: string;
  color: string; // hex, theme-independent
  rank: number;
}

export const PRIORITIES: PriorityMeta[] = [
  { key: "high", label: "Высокий", color: "#f87171", rank: 3 },
  { key: "medium", label: "Средний", color: "#fbbf24", rank: 2 },
  { key: "low", label: "Низкий", color: "#60a5fa", rank: 1 },
  { key: "none", label: "Без приоритета", color: "#8b8b8b", rank: 0 },
];

export function priorityMeta(p: Priority | undefined | null): PriorityMeta {
  return PRIORITIES.find((x) => x.key === p) ?? PRIORITIES[3];
}

export function priorityRank(p: Priority | undefined | null): number {
  return priorityMeta(p).rank;
}

export interface ColorMeta {
  key: string;
  label: string;
  hex: string | null; // null = default (theme text colour)
}

export const WS_COLORS: ColorMeta[] = [
  { key: "", label: "По умолчанию", hex: null },
  { key: "red", label: "Красный", hex: "#f87171" },
  { key: "orange", label: "Оранжевый", hex: "#fb923c" },
  { key: "yellow", label: "Жёлтый", hex: "#facc15" },
  { key: "green", label: "Зелёный", hex: "#4ade80" },
  { key: "blue", label: "Синий", hex: "#60a5fa" },
  { key: "purple", label: "Фиолетовый", hex: "#c084fc" },
  { key: "pink", label: "Розовый", hex: "#f472b6" },
];

export function colorHex(key: string | undefined | null): string | null {
  return WS_COLORS.find((c) => c.key === key)?.hex ?? null;
}

/* ---- small building blocks ------------------------------------------- */

/** A left accent bar built from the item's custom colour (falls back to none). */
export function accentStyle(color: string | undefined | null): React.CSSProperties {
  const hex = colorHex(color);
  return hex ? { borderLeftColor: hex, borderLeftWidth: 3 } : {};
}

/** Coloured dot for a priority (hidden entirely for "none"). */
export function PriorityDot({ priority, className = "" }: { priority: Priority; className?: string }) {
  const m = priorityMeta(priority);
  if (m.key === "none") return null;
  return (
    <span
      title={`Приоритет: ${m.label}`}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: m.color }}
    />
  );
}

/* ---- pickers --------------------------------------------------------- */

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  return ref;
}

export function PriorityPicker({
  value,
  onChange,
  size = 15,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));
  const m = priorityMeta(value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Приоритет: ${m.label}`}
        className="flex items-center rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
      >
        <Flag size={size} style={{ color: m.key === "none" ? undefined : m.color }} fill={m.key === "none" ? "none" : m.color} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-vsc-line bg-vsc-sidebar py-1 shadow-lg">
          {PRIORITIES.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                onChange(p.key);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-vsc-text hover:bg-vsc-hover"
            >
              <Flag size={13} style={{ color: p.key === "none" ? "#8b8b8b" : p.color }} fill={p.key === "none" ? "none" : p.color} />
              <span className="flex-1">{p.label}</span>
              {p.key === value && <Check size={13} className="text-vsc-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  size = 15,
}: {
  value: string;
  onChange: (c: string) => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));
  const hex = colorHex(value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Цвет"
        className="flex items-center rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
      >
        <Palette size={size} style={{ color: hex ?? undefined }} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 flex w-40 flex-wrap gap-1.5 rounded-md border border-vsc-line bg-vsc-sidebar p-2 shadow-lg">
          {WS_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                onChange(c.key);
                setOpen(false);
              }}
              title={c.label}
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                c.key === value ? "border-vsc-accent" : "border-vsc-line"
              }`}
              style={{ backgroundColor: c.hex ?? "transparent" }}
            >
              {c.key === value && <Check size={12} className={c.hex ? "text-black/70" : "text-vsc-muted"} />}
              {!c.hex && c.key !== value && <span className="text-[10px] text-vsc-muted">×</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
