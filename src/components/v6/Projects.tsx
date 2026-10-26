"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, ExternalLink, FolderGit2, MonitorPlay, X } from "lucide-react";
import { PROJECTS } from "@/lib/profile";
import { track } from "@/lib/track";
import { setDesign } from "@/lib/design";
import { Chip, SectionHead, useL } from "./ui";
import { ProjectPreview } from "./Previews";

type Project = (typeof PROJECTS)[number];
type Cat = "all" | "ai" | "3d" | "tools" | "web";

const META: Record<string, { cats: Cat[]; hue: [string, string]; featured?: boolean }> = {
  "projects/repo-janitor.ts": { cats: ["tools", "ai"], hue: ["#10b981", "#0ea5e9"], featured: true },
  "projects/personal-workspace.tsx": { cats: ["web", "ai"], hue: ["#3178c6", "#8b5cf6"], featured: true },
  "projects/yasen-store.js": { cats: ["3d", "web"], hue: ["#b45309", "#f59e0b"] },
  "projects/physlab-3d.js": { cats: ["3d"], hue: ["#ec4899", "#8b5cf6"] },
  "projects/job-search-tool.ts": { cats: ["ai", "tools"], hue: ["#6366f1", "#22d3ee"] },
  "projects/hephaestus.ts": { cats: ["ai"], hue: ["#ef4444", "#f97316"] },
  "projects/readme-studio.tsx": { cats: ["tools", "web"], hue: ["#a855f7", "#ec4899"] },
  "projects/argus.ts": { cats: ["ai"], hue: ["#5865f2", "#06b6d4"] },
  "projects/cyberpath.html": { cats: ["web"], hue: ["#22c55e", "#14b8a6"] },
  "projects/property-inbox.tsx": { cats: ["web", "ai"], hue: ["#f43f5e", "#f59e0b"] },
  "projects/figma-copy.tsx": { cats: ["tools"], hue: ["#f24e1e", "#a259ff"] },
};

/** Demos that allow being shown in an iframe (GitHub Pages). Others open in a new tab. */
const EMBEDDABLE = /ypciiiak\.github\.io/;

const CATS: { id: Cat; ru: string; en: string }[] = [
  { id: "all", ru: "Все", en: "All" },
  { id: "ai", ru: "AI и агенты", en: "AI & agents" },
  { id: "3d", ru: "3D и графика", en: "3D & graphics" },
  { id: "tools", ru: "Инструменты", en: "Dev tools" },
  { id: "web", ru: "Веб-продукты", en: "Web products" },
];

function demoOf(p: Project): string | undefined {
  return "demo" in p ? (p.demo as string | undefined) : undefined;
}

function TiltCard({ p, onOpen, big }: { p: Project; onOpen: () => void; big?: boolean }) {
  const { tr } = useL();
  const m = META[p.id];
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });
  const glowX = useTransform(sry, [-6, 6], ["20%", "80%"]);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      onClick={onOpen}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 text-left backdrop-blur-sm transition-colors hover:border-[rgb(var(--a)/0.45)] ${
        big ? "sm:col-span-2" : ""
      }`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
        style={{ left: glowX, background: m?.hue[0] }}
      />
      <div
        className={`relative mb-4 overflow-hidden rounded-xl ${big ? "h-44" : "h-36"}`}
        style={{ background: `linear-gradient(135deg, ${m?.hue[0]}, ${m?.hue[1]})` }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
        />
        {m && <ProjectPreview id={p.id} hue={m.hue} />}
        {demoOf(p) && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
          </span>
        )}
      </div>
      <div className="relative flex items-start justify-between gap-2">
        <h3 className="text-[17px] font-semibold tracking-tight">{p.title}</h3>
        <ArrowUpRight
          size={18}
          className="shrink-0 text-[var(--muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[rgb(var(--a))]"
        />
      </div>
      <p className={`relative mt-2 text-[13.5px] leading-relaxed text-[var(--muted)] ${big ? "line-clamp-3" : "line-clamp-4"}`}>
        {tr(p.summary)}
      </p>
      <div className="relative mt-auto flex flex-wrap gap-1.5 pt-4">
        {p.tech.slice(0, big ? 7 : 4).map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>
    </motion.button>
  );
}

function ProjectModal({ p, onClose }: { p: Project; onClose: () => void }) {
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

export function Projects() {
  const { l } = useL();
  const [cat, setCat] = useState<Cat>("all");
  const [open, setOpen] = useState<Project | null>(null);
  const list = PROJECTS.filter((p) => cat === "all" || META[p.id]?.cats.includes(cat));

  useEffect(() => {
    const onOpen = (e: Event) => {
      const p = PROJECTS.find((x) => x.id === (e as CustomEvent<string>).detail);
      if (p) setOpen(p);
    };
    window.addEventListener("v6-open-project", onOpen);
    return () => window.removeEventListener("v6-open-project", onOpen);
  }, []);

  return (
    <section id="projects" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
      <SectionHead
        id="projects"
        kicker={l("01 · проекты", "01 · projects")}
        title={l("Что я сделал", "Things I've built")}
        sub={l(
          "Продукты, инструменты и эксперименты. Откройте карточку — у проектов с пометкой live демо запускается прямо здесь.",
          "Products, tools and experiments. Open a card — projects marked live run right here.",
        )}
      />

      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`relative shrink-0 rounded-full border px-4 py-2 text-[13px] transition-colors ${
              cat === c.id ? "border-transparent text-white" : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {cat === c.id && (
              <motion.span
                layoutId="v6-cat"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{l(c.ru, c.en)}</span>
          </button>
        ))}
      </div>

      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((p) => (
            <TiltCard
              key={p.id}
              p={p}
              big={cat === "all" && META[p.id]?.featured}
              onOpen={() => {
                track(`проект 6.0: ${p.title}`);
                setOpen(p);
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>{open && <ProjectModal key={open.id} p={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </section>
  );
}
