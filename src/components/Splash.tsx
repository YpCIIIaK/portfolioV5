"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  "Initializing workspace…",
  "Loading extensions (react, go, tailwind)…",
  "Connecting to GitHub API…",
  "Establishing Binance WebSocket…",
  "Indexing projects…",
];

export function Splash() {
  const [done, setDone] = useState(0);
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setDone(i + 1), 260 * (i + 1)));
    });
    timers.push(setTimeout(() => setHide(true), 260 * STEPS.length + 450));
    timers.push(setTimeout(() => setGone(true), 260 * STEPS.length + 850));
    return () => timers.forEach(clearTimeout);
  }, []);

  if (gone) return null;

  return (
    <div
      onClick={() => {
        setHide(true);
        setTimeout(() => setGone(true), 350);
      }}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#1e1e1e] transition-opacity duration-300 ${
        hide ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* VSCode-ish logo */}
      <svg width="72" height="72" viewBox="0 0 100 100" className="mb-6">
        <path
          d="M75 12 L92 20 V80 L75 88 L38 56 L20 70 L10 64 V36 L20 30 L38 44 L75 12 Z"
          fill="#3178c6"
          opacity="0.9"
        />
        <path d="M75 12 L92 20 V80 L75 88 L40 50 Z" fill="#0098ff" opacity="0.5" />
      </svg>
      <h1 className="text-lg font-light tracking-wide text-vsc-text">
        Vladimir · Portfolio
      </h1>

      <div className="mt-6 w-72 space-y-1.5 font-mono text-[12px]">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 transition-opacity ${
              i < done ? "text-vsc-muted opacity-100" : i === done ? "opacity-100" : "opacity-30"
            }`}
          >
            {i < done ? (
              <Check size={13} className="text-vsc-green" />
            ) : i === done ? (
              <Loader2 size={13} className="animate-spin text-vsc-accent" />
            ) : (
              <span className="h-[13px] w-[13px]" />
            )}
            <span className={i < done ? "text-vsc-muted" : "text-vsc-text"}>{s}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 h-0.5 w-72 overflow-hidden rounded bg-[#2d2d2d]">
        <div
          className="h-full bg-vsc-accent transition-all duration-200"
          style={{ width: `${(done / STEPS.length) * 100}%` }}
        />
      </div>
      <p className="mt-3 text-[11px] text-vsc-muted">click to skip</p>
    </div>
  );
}
