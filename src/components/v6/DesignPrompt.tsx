"use client";

import { motion } from "framer-motion";
import { Code2, Sparkles } from "lucide-react";
import { setDesign } from "@/lib/design";
import { track } from "@/lib/track";
import { useEditor } from "@/lib/store";

/** Shown once after the splash: stay in the VS Code look or switch to the 6.0 design. */
export function DesignPrompt() {
  const en = useEditor((s) => s.lang) === "en";
  const pick = (d: "ide" | "v6") => {
    track(d === "v6" ? "✨ выбрал дизайн 6.0" : "остался в VS Code");
    setDesign(d);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-prompt-title"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#16161d] p-6 text-[#e6e6ef] shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-violet-200">
            <Sparkles size={12} /> {en ? "New · Design 6.0" : "Новое · Дизайн 6.0"}
          </div>
          <h2 id="design-prompt-title" className="text-xl font-semibold text-white">
            {en ? "Switch to the visual design?" : "Переключиться на визуальный дизайн?"}
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#a9a9bd]">
            {en
              ? "This site looks like VS Code. There is also a classic portfolio: projects with live demos, experience, stack and contacts on one page, with themes and animations. You can switch back any time."
              : "Сейчас сайт выглядит как VS Code. Есть и классическая версия: проекты с живыми демо, опыт, стек и контакты на одной странице, с темами и анимациями. Вернуться можно в любой момент."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              autoFocus
              onClick={() => pick("v6")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-500 px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:brightness-110"
            >
              <Sparkles size={16} /> {en ? "Yes, show it" : "Да, показать"}
            </button>
            <button
              onClick={() => pick("ide")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[13.5px] text-[#d6d6e3] transition hover:bg-white/10"
            >
              <Code2 size={16} /> {en ? "No, keep VS Code" : "Нет, оставить VS Code"}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#7d7d93]">
            {en ? "The switch button is always in the corner." : "Кнопка переключения всегда в углу экрана."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
