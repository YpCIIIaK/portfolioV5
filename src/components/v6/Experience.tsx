"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GraduationCap } from "lucide-react";
import { EXPERIENCE } from "@/lib/profile";
import { Reveal, SectionHead, card, useL } from "./ui";

export function Experience() {
  const { l, tr } = useL();
  const [open, setOpen] = useState<string | null>(EXPERIENCE[0].id);

  return (
    <section id="experience" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
      <SectionHead
        id="experience"
        kicker={l("03 · опыт", "03 · experience")}
        title={l("Где я работал", "Where I've worked")}
        sub={l("Агентство, HR-tech, криптостартап и боты для бизнеса.", "An agency, HR-tech, a crypto startup and business bots.")}
      />
      <div className="relative">
        <div className="absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-[rgb(var(--a))] via-[rgb(var(--b)/0.5)] to-transparent sm:left-[15px]" />
        <div className="space-y-4">
          {EXPERIENCE.map((job, i) => {
            const isOpen = open === job.id;
            const [company, role] = job.title.split(" · ");
            return (
              <Reveal key={job.id} delay={i * 0.05} className="relative pl-9 sm:pl-12">
                <span
                  className={`absolute left-[5px] top-6 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg)] sm:left-[9px] ${
                    isOpen ? "bg-[rgb(var(--a))] shadow-[0_0_0_4px_rgb(var(--a)/0.25)]" : "bg-[var(--muted)]"
                  }`}
                />
                <div className={card}>
                  <button
                    onClick={() => setOpen(isOpen ? null : job.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-4 p-5 text-left"
                  >
                    <div>
                      <div className="text-[17px] font-semibold tracking-tight">{company}</div>
                      <div className="text-[14px] text-[rgb(var(--a))]">{role}</div>
                      <div className="mt-1 text-[13px] text-[var(--muted)]">{tr(job.period)}</div>
                    </div>
                    <ChevronDown size={18} className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-2.5 px-5 pb-5">
                          {job.points.map((p) => (
                            <li key={p} className="flex gap-3 text-[14px] leading-relaxed text-[var(--muted)]">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--a))]" />
                              {tr(p)}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
          <Reveal className="relative pl-9 sm:pl-12">
            <span className="absolute left-[5px] top-5 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg)] bg-[var(--muted)] sm:left-[9px]" />
            <div className={`${card} flex items-center gap-3 p-5`}>
              <GraduationCap size={20} className="shrink-0 text-[rgb(var(--a))]" />
              <div>
                <div className="font-medium">{l("ТУСУР", "TUSUR")}</div>
                <div className="text-[13px] text-[var(--muted)]">{l("Неоконченное высшее · Английский B2+", "Incomplete higher education · English B2+")}</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
