"use client";

import { useState, useSyncExternalStore } from "react";
import { isReplayMode } from "@/lib/replay";
import { useTr } from "@/lib/i18n";
import { useEditor } from "@/lib/store";
import { useDesign } from "@/lib/design";

const KEY = "privacy-ack";

/** One-time notice at the bottom: using the site means agreeing to the privacy policy. */
export function PrivacyBanner() {
  // Read localStorage only on the client (server snapshot: hidden) — no hydration mismatch.
  const needed = useSyncExternalStore(
    () => () => {},
    () => {
      if (isReplayMode()) return false;
      try {
        return !localStorage.getItem(KEY);
      } catch {
        return true;
      }
    },
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  const tr = useTr();
  const lang = useEditor((s) => s.lang);
  const v6 = useDesign() === "v6";
  const show = needed && !dismissed;

  if (!show) return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* storage blocked: just hide for this page */
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className={
        v6
          ? "fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-[#14141c]/90 px-5 py-4 text-[13px] text-[#d9d9e6] shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center"
          : "fixed inset-x-2 bottom-8 z-50 mx-auto flex max-w-2xl flex-col gap-2 rounded-md border border-vsc-line bg-vsc-sidebar px-4 py-3 text-[12.5px] text-vsc-text shadow-xl sm:flex-row sm:items-center"
      }
    >
      <p className="flex-1 leading-snug">
        {tr(
          "Пользуясь сайтом, вы соглашаетесь с политикой конфиденциальности: сайт собирает статистику визитов и записывает действия на странице (без вводимого текста).",
        )}{" "}
        <a href={lang === "en" ? "/privacy#en" : "/privacy"} className={v6 ? "text-violet-300 underline" : "text-vsc-accent underline"} target="_blank" rel="noreferrer">
          {tr("Подробнее")}
        </a>
      </p>
      <button
        onClick={close}
        className={
          v6
            ? "shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-sky-500 px-4 py-2 text-[12.5px] font-medium text-white hover:brightness-110"
            : "shrink-0 rounded bg-vsc-accent px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90"
        }
      >
        {tr("Понятно")}
      </button>
    </div>
  );
}
