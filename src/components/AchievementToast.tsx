"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEditor } from "@/lib/store";
import { achievementById } from "@/lib/achievements";

export function AchievementToast() {
  const toasts = useEditor((s) => s.toasts);
  const dismiss = useEditor((s) => s.dismissToast);
  const current = toasts[0];

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, 4200);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  const ach = current ? achievementById(current) : null;

  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-[90] flex flex-col items-end gap-2">
      <AnimatePresence>
        {ach && (
          <motion.div
            key={ach.id}
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={dismiss}
            className="pointer-events-auto flex w-72 cursor-pointer items-center gap-3 overflow-hidden rounded-md border border-vsc-line bg-[#1b1b1b] p-3 shadow-2xl"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#2a2a2a] to-[#101010] text-2xl ring-1 ring-vsc-accent/40">
              {ach.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-vsc-accent">
                Достижение разблокировано
              </div>
              <div className="truncate text-[13px] font-semibold text-vsc-bright">
                {ach.title}
              </div>
              <div className="truncate text-[11px] text-vsc-muted">{ach.desc}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
