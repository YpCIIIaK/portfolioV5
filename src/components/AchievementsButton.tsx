"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy, Lock } from "lucide-react";
import { useEditor } from "@/lib/store";
import { ACHIEVEMENTS, NON_META } from "@/lib/achievements";

export function AchievementsButton() {
  const achievements = useEditor((s) => s.achievements);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unlocked = NON_META.filter((a) => achievements[a.id]).length;
  const total = NON_META.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-[3px] hover:bg-white/15"
        title="Достижения"
      >
        <Trophy size={13} /> {unlocked}/{total}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 w-72 overflow-hidden rounded border border-vsc-line bg-[var(--vsc-sidebar)] text-vsc-text shadow-2xl">
          <div className="flex items-center justify-between border-b border-vsc-line px-3 py-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide">Достижения</span>
            <span className="text-[11px] text-vsc-muted">{unlocked}/{total}</span>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {ACHIEVEMENTS.map((a) => {
              const got = achievements[a.id];
              const hidden = a.secret && !got;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2.5 px-3 py-1.5 ${got ? "" : "opacity-55"}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--vsc-bg)] text-base">
                    {got ? a.icon : <Lock size={13} className="text-vsc-muted" />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium">
                      {hidden ? "???" : a.title}
                    </div>
                    <div className="truncate text-[11px] text-vsc-muted">
                      {hidden ? "Секретное достижение" : a.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
