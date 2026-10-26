"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FolderGit2, MonitorPlay, X } from "lucide-react";
import { PROJECTS } from "@/lib/profile";
import { track } from "@/lib/track";
import { setDesign } from "@/lib/design";
import { Chip, useL } from "./ui";
import { ProjectPreview } from "./Previews";

export type Project = (typeof PROJECTS)[number];

export const META: Record<string, { hue: [string, string] }> = {
  "projects/repo-janitor.ts": { hue: ["#10b981", "#0ea5e9"] },
  "projects/personal-workspace.tsx": { hue: ["#3178c6", "#8b5cf6"] },
  "projects/yasen-store.js": { hue: ["#b45309", "#f59e0b"] },
  "projects/physlab-3d.js": { hue: ["#ec4899", "#8b5cf6"] },
  "projects/job-search-tool.ts": { hue: ["#6366f1", "#22d3ee"] },
  "projects/hephaestus.ts": { hue: ["#ef4444", "#f97316"] },
  "projects/readme-studio.tsx": { hue: ["#a855f7", "#ec4899"] },
  "projects/argus.ts": { hue: ["#5865f2", "#06b6d4"] },
  "projects/cyberpath.html": { hue: ["#22c55e", "#14b8a6"] },
  "projects/property-inbox.tsx": { hue: ["#f43f5e", "#f59e0b"] },
  "projects/figma-copy.tsx": { hue: ["#f24e1e", "#a259ff"] },
};

/** Demos that allow being shown in an iframe (GitHub Pages). Others open in a new tab. */
const EMBEDDABLE = /ypciiiak\.github\.io/;

export function demoOf(p: Project): string | undefined {
  return "demo" in p ? (p.demo as string | undefined) : undefined;
}

export function ProjectModal({ p, onClose }: { p: Project; onClose: () => void }) {
  const { l, tr } = useL();
  const demo = demoOf(p);
  const embeddable = demo ? EMBEDDABLE.test(demo) : false;
  const isSelf = p.id === "projects/personal-workspace.tsx";
  const [tab, setTab] = useState<"about" | "demo">("about");
  const m = META[p.id];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--line)] bg-[var(--bg2)] shadow-2xl sm:rounded-3xl ${
          tab === "demo" ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        {tab === "about" && m && (
          <div className="relative h-40 shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${m.hue[0]}, ${m.hue[1]})` }}>
            <div className="absolute inset-0 bg-black/45" />
            <div className="group absolute inset-0 scale-125">
              <ProjectPreview id={p.id} hue={m.hue} />
            </div>
          </div>
        )}
        <div
          className="relative shrink-0 px-6 pb-4 pt-5"
          style={{ background: `linear-gradient(135deg, ${m?.hue[0]}2e, transparent 70%)` }}
        >
          <button
            onClick={onClose}
            aria-label={l("Закрыть", "Close")}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)]"
          >
            <X size={16} />
          </button>
          <h3 className="pr-10 text-2xl font-semibold tracking-tight">{p.title}</h3>
          <p className="mt-1 text-[13px] text-[var(--muted)]">{p.language}</p>
          {embeddable && (
            <div className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-[var(--card)] p-1 text-[13px]">
              {(["about", "demo"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    if (t === "demo") track(`▶ демо: ${p.title}`);
                  }}
                  className={`relative rounded-full px-4 py-1.5 ${tab === t ? "text-[var(--fg)]" : "text-[var(--muted)]"}`}
                >
                  {tab === t && <motion.span layoutId="v6-modal-tab" className="absolute inset-0 rounded-full bg-[rgb(var(--a)/0.2)]" />}
                  <span className="relative flex items-center gap-1.5">
                    {t === "demo" && <MonitorPlay size={14} />}
                    {t === "about" ? l("О проекте", "Overview") : l("Живое демо", "Live demo")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === "demo" && demo ? (
          <div className="relative min-h-0 flex-1 border-t border-[var(--line)] bg-[var(--bg)]">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[13px] text-[var(--muted)]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line)] border-t-[rgb(var(--a))]" />
              {l("Загружаем демо…", "Loading the demo…")}
            </div>
            <iframe
              src={demo}
              title={p.title}
              loading="lazy"
              className="relative h-[70dvh] w-full"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <p className="text-[15px] leading-relaxed">{tr(p.summary)}</p>
            <ul className="mt-5 space-y-3">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-3 text-[14px] leading-relaxed text-[var(--muted)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--a))]" />
                  {tr(pt)}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {p.tech.map((t) => (
                <Chip key={t} active>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--line)] px-6 py-4">
          <a
            href={`https://github.com/YpCIIIaK/${p.repo}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-[13.5px] hover:bg-[var(--card-hover)]"
          >
            <FolderGit2 size={15} /> GitHub
          </a>
          {isSelf ? (
            <button
              onClick={() => setDesign("ide")}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))] px-4 py-2 text-[13.5px] font-medium text-white"
            >
              {l("Открыть версию VS Code", "Open the VS Code version")}
            </button>
          ) : (
            demo && (
              <a
                href={demo}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))] px-4 py-2 text-[13.5px] font-medium text-white"
              >
                <ExternalLink size={15} /> {l("Открыть проект", "Open project")}
              </a>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

