"use client";

import { motion } from "framer-motion";
import { useEditor } from "@/lib/store";
import { translate } from "@/lib/i18n";

/** Pick the string for the current language; profile texts go through the shared dictionary. */
export function useL() {
  const lang = useEditor((s) => s.lang);
  return {
    lang,
    en: lang === "en",
    l: (ru: string, en: string) => (lang === "en" ? en : ru),
    tr: (text: string) => translate(lang, text),
  };
}

/** Fade + lift into view once. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({ id, kicker, title, sub }: { id: string; kicker: string; title: string; sub?: string }) {
  return (
    <Reveal className="mb-10 max-w-2xl">
      <a href={`#${id}`} className="font-mono text-[12px] uppercase tracking-[0.2em] text-[rgb(var(--a))]">
        {kicker}
      </a>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{sub}</p>}
    </Reveal>
  );
}

export function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] ${
        active
          ? "border-[rgb(var(--a)/0.5)] bg-[rgb(var(--a)/0.15)] text-[var(--fg)]"
          : "border-[var(--line)] bg-[var(--card)] text-[var(--muted)]"
      }`}
    >
      {children}
    </span>
  );
}

export const card =
  "rounded-2xl border border-[var(--line)] bg-[var(--card)] backdrop-blur-sm transition-colors hover:bg-[var(--card-hover)]";
