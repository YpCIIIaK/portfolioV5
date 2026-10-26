"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Code2, CornerDownLeft, FileText, FolderOpen, Hash, Search } from "lucide-react";
import { PROJECTS } from "@/lib/profile";
import { SECTIONS, scrollToSection } from "./Showcase";
import { useL } from "./ui";

interface Item {
  id: string;
  keywords?: string;
  label: string;
  group: string;
  Icon: typeof Hash;
  run: () => void;
}

/** Ctrl+K: jump to a section or project, open the CV, go back to VS Code. */
export function Palette({ open, onClose, onBack }: { open: boolean; onClose: () => void; onBack: () => void }) {
  const { l } = useL();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(
    () => [
      ...SECTIONS.map((s) => ({
        id: s.id,
        label: l(s.ru, s.en),
        group: l("Разделы", "Sections"),
        Icon: Hash,
        run: () => scrollToSection(s.id),
      })),
      ...PROJECTS.map((p) => ({
        id: p.id,
        label: p.title,
        keywords: `${p.id} ${p.tech.join(" ")}`,
        group: l("Проекты", "Projects"),
        Icon: FolderOpen,
        run: () => window.dispatchEvent(new CustomEvent("v6-goto-station", { detail: p.id })),
      })),
      { id: "cv", label: l("Резюме PDF", "Resume PDF"), group: l("Действия", "Actions"), Icon: FileText, run: () => window.open("/cv", "_blank") },
      { id: "ide", label: l("Вернуться в VS Code", "Back to VS Code"), group: l("Действия", "Actions"), Icon: Code2, run: onBack },
    ],
    [l, onBack],
  );
  const needle = q.trim().toLowerCase();
  const filtered = items.filter((i) => `${i.label} ${i.keywords ?? ""}`.toLowerCase().includes(needle));

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const choose = (i: Item | undefined) => {
    if (!i) return;
    onClose();
    setQ("");
    setSel(0);
    i.run();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[14vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: -12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg2)] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
              <Search size={16} className="text-[var(--muted)]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSel((s) => Math.min(filtered.length - 1, s + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSel((s) => Math.max(0, s - 1));
                  } else if (e.key === "Enter") {
                    choose(filtered[sel]);
                  } else if (e.key === "Escape") {
                    onClose();
                  }
                }}
                placeholder={l("Куда перейти?", "Where to?")}
                className="h-14 flex-1 bg-transparent text-[15px] outline-none"
              />
              <kbd className="rounded border border-[var(--line)] px-1.5 text-[11px] text-[var(--muted)]">Esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 && <p className="p-4 text-center text-[14px] text-[var(--muted)]">{l("Ничего не нашлось", "Nothing found")}</p>}
              {filtered.map((it, i) => (
                <div key={it.id}>
                  {(i === 0 || filtered[i - 1].group !== it.group) && (
                    <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-[var(--muted)]">{it.group}</div>
                  )}
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={() => choose(it)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] ${
                      sel === i ? "bg-[rgb(var(--a)/0.15)]" : ""
                    }`}
                  >
                    <it.Icon size={15} className="text-[var(--muted)]" />
                    <span className="flex-1">{it.label}</span>
                    {sel === i && <CornerDownLeft size={14} className="text-[var(--muted)]" />}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
