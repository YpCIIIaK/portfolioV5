"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionTemplate } from "framer-motion";
import { ArrowDown, FileText, MapPin, Send } from "lucide-react";
import { AVAILABILITY, SUMMARY } from "@/lib/profile";
import { useL } from "./ui";
import { scrollToSection } from "./Showcase";

const ROLES = ["Frontend Developer", "Full-Stack Developer", "React · Next.js · TypeScript", "AI tools & bots"];

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return (
    <span ref={ref}>
      {v.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

function RoleRotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % ROLES.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-flex h-[1.3em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={i}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "-100%", opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="v6-grad-text whitespace-nowrap"
      >
        {ROLES[i]}
      </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Hero() {
  const { l, tr } = useL();
  const mx = useMotionValue(50);
  const my = useMotionValue(30);
  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${mx}% ${my}%, rgb(var(--a) / 0.16), transparent 60%)`;

  const stats = [
    { n: 2, s: "+", label: l("года коммерческого опыта", "years of commercial experience") },
    { n: 11, s: "", label: l("проектов в портфолио", "portfolio projects") },
    { n: 1600, s: "+", label: l("тестов в Repo Janitor", "tests in Repo Janitor") },
    { n: 15, s: "M+", label: l("профилей в HR-поиске", "profiles in HR search") },
  ];

  return (
    <section
      id="about"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
      className="relative scroll-mt-16 overflow-hidden"
    >
      <div className="v6-grid-bg pointer-events-none absolute inset-0" />
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />
      <motion.div
        aria-hidden
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[rgb(var(--a)/0.25)] blur-[100px]"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-24 top-40 h-96 w-96 rounded-full bg-[rgb(var(--b)/0.2)] blur-[100px]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1 text-[12.5px] text-[var(--muted)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {l("Открыт к удалённой работе", "Open to remote work")}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-[clamp(2.4rem,7vw,5rem)] font-semibold leading-[1.05] tracking-tight"
        >
          {l("Привет, я Владимир.", "Hi, I'm Vladimir.")}
          <span className="mt-1 block text-[clamp(1.45rem,6vw,5rem)]">
            <RoleRotator />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.7 }}
          className="mt-6 max-w-2xl text-[16.5px] leading-relaxed text-[var(--muted)]"
        >
          {tr(SUMMARY)}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
          className="mt-3 flex items-center gap-1.5 text-[13.5px] text-[var(--muted)]"
        >
          <MapPin size={14} className="text-[rgb(var(--a))]" /> {tr(AVAILABILITY)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <button
            onClick={() => scrollToSection("projects")}
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))] px-5 py-3 text-[14px] font-medium text-white shadow-[0_8px_30px_rgb(var(--a)/0.35)] transition hover:brightness-110"
          >
            {l("Смотреть проекты", "View projects")}
            <ArrowDown size={16} className="transition group-hover:translate-y-0.5" />
          </button>
          <a
            href="/cv"
            target="_blank"
            className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-5 py-3 text-[14px] transition hover:bg-[var(--card-hover)]"
          >
            <FileText size={16} /> {l("Резюме PDF", "Resume PDF")}
          </a>
          <a
            href="https://t.me/bigboyvova"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-5 py-3 text-[14px] transition hover:bg-[var(--card-hover)]"
          >
            <Send size={16} /> Telegram
          </a>
        </motion.div>

        <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 backdrop-blur-sm"
            >
              <div className="text-3xl font-semibold tracking-tight">
                <Counter to={s.n} suffix={s.s} />
              </div>
              <div className="mt-1 text-[12.5px] leading-snug text-[var(--muted)]">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
