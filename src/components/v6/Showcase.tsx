"use client";

import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion, useScroll, useSpring } from "framer-motion";
import { Code2, Command, Menu, Moon, Palette, Sun, Sparkles, X } from "lucide-react";
import { setDesign } from "@/lib/design";
import { track } from "@/lib/track";
import { useEditor } from "@/lib/store";
import { useL } from "./ui";
import { Metro } from "./Metro";
import { Live } from "./Live";
import { Stack } from "./Stack";
import { Contact } from "./Contact";
import { Palette as QuickNav } from "./QuickNav";

const THEMES = ["night", "aurora", "light"] as const;
const ACCENTS = [
  { id: "violet", color: "#8b5cf6" },
  { id: "sky", color: "#38bdf8" },
  { id: "emerald", color: "#10b981" },
  { id: "amber", color: "#f59e0b" },
  { id: "rose", color: "#f43f5e" },
] as const;

export const SECTIONS = [
  { id: "route", ru: "Маршрут", en: "Route" },
  { id: "live", ru: "Вживую", en: "Live" },
  { id: "stack", ru: "Стек", en: "Stack" },
  { id: "contact", ru: "Контакты", en: "Contact" },
];

function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage blocked */
  }
}

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Design 6.0: a classic one-page portfolio built from the same data as the IDE. */
export function Showcase() {
  const { l, lang } = useL();
  const toggleLang = useEditor((s) => s.toggleLang);
  const scroller = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<(typeof THEMES)[number]>(() =>
    stored("v6-theme", THEMES, "night"),
  );
  const [accent, setAccent] = useState<string>(() => stored("v6-accent", ACCENTS.map((a) => a.id), "violet"));
  const [active, setActive] = useState("route");
  const [menu, setMenu] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [accentsOpen, setAccentsOpen] = useState(false);

  const { scrollYProgress } = useScroll({ container: scroller });
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  // Highlight the section in view.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nextTheme = () => {
    const t = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(t);
    save("v6-theme", t);
  };
  const backToIde = () => {
    track("вернулся в VS Code");
    setDesign("ide");
  };
  const go = (id: string) => {
    setMenu(false);
    scrollToSection(id);
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "aurora" ? Sparkles : Moon;
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] transition hover:text-[var(--fg)]";

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={scroller}
        id="v6-scroll"
        lang={lang}
        data-v6-theme={theme}
        data-v6-accent={accent}
        className="v6 relative h-dvh w-full overflow-x-hidden overflow-y-auto font-sans"
      >
        <motion.div
          style={{ scaleX: progress }}
          className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))]"
        />

        <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_75%,transparent)] backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <button onClick={() => go("route")} className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[rgb(var(--a))] to-[rgb(var(--b))] text-[13px] font-bold text-white">
                V
              </span>
              <span className="hidden sm:inline">Vladimir</span>
            </button>

            <div className="mx-auto hidden items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--card)] p-1 md:flex">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => go(s.id)}
                  className={`relative rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                    active === s.id ? "text-[var(--fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {active === s.id && (
                    <motion.span
                      layoutId="v6-nav-pill"
                      className="absolute inset-0 rounded-full bg-[rgb(var(--a)/0.18)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{l(s.ru, s.en)}</span>
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1.5 md:ml-0">
              <button onClick={() => setPaletteOpen(true)} className={`${iconBtn} hidden sm:flex`} title="Ctrl+K">
                <Command size={15} />
              </button>
              <button onClick={toggleLang} className={`${iconBtn} text-[11px] font-semibold`} title="RU / EN">
                {lang === "en" ? "EN" : "RU"}
              </button>
              <button onClick={nextTheme} className={iconBtn} title={l("Тема", "Theme")}>
                <ThemeIcon size={15} />
              </button>
              <div className="relative">
                <button onClick={() => setAccentsOpen((v) => !v)} className={iconBtn} title={l("Акцент", "Accent")}>
                  <Palette size={15} />
                </button>
                {accentsOpen && (
                  <div className="absolute right-0 top-11 flex gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg2)] p-1.5 shadow-xl">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.id}
                        aria-label={a.id}
                        onClick={() => {
                          setAccent(a.id);
                          save("v6-accent", a.id);
                          setAccentsOpen(false);
                        }}
                        className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-[var(--bg2)] ${accent === a.id ? "ring-2 ring-[var(--fg)]" : ""}`}
                        style={{ background: a.color }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={backToIde}
                className="ml-1 hidden items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[12.5px] text-[var(--muted)] transition hover:text-[var(--fg)] sm:flex"
              >
                <Code2 size={14} /> VS Code
              </button>
              <button onClick={() => setMenu((v) => !v)} className={`${iconBtn} md:hidden`} aria-label="Menu">
                {menu ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </nav>
          {menu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[var(--line)] px-4 py-3 md:hidden"
            >
              {SECTIONS.map((s) => (
                <button key={s.id} onClick={() => go(s.id)} className="block w-full py-2 text-left text-[15px]">
                  {l(s.ru, s.en)}
                </button>
              ))}
              <button onClick={backToIde} className="mt-1 flex items-center gap-2 py-2 text-[15px] text-[rgb(var(--a))]">
                <Code2 size={16} /> {l("Вернуться в VS Code", "Back to VS Code")}
              </button>
            </motion.div>
          )}
        </header>

        <main>
          <Metro scroller={scroller} />
          <Live />
          <Stack />
          <Contact />
        </main>

        <footer className="border-t border-[var(--line)]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-[13px] text-[var(--muted)] sm:flex-row sm:px-6">
            <span>© {new Date().getFullYear()} Vladimir · Portfolio 6.0</span>
            <div className="flex items-center gap-4">
              <a href={lang === "en" ? "/privacy#en" : "/privacy"} className="hover:text-[var(--fg)]">
                {l("Конфиденциальность", "Privacy")}
              </a>
              <button onClick={backToIde} className="flex items-center gap-1.5 hover:text-[var(--fg)]">
                <Code2 size={14} /> {l("Версия VS Code", "VS Code version")}
              </button>
            </div>
          </div>
        </footer>

        <QuickNav open={paletteOpen} onClose={() => setPaletteOpen(false)} onBack={backToIde} />
      </div>
    </MotionConfig>
  );
}
