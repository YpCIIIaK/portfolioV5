"use client";

import { GitBranch, Check, X, Bell, Code2, RefreshCw, Languages } from "lucide-react";
import { useEditor } from "@/lib/store";
import { fileById, GITHUB } from "@/lib/files";
import { LiveTicker } from "./LiveTicker";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AchievementsButton } from "./AchievementsButton";

export function StatusBar() {
  const activeFile = useEditor((s) => s.activeFile);
  const toggleTerminal = useEditor((s) => s.toggleTerminal);
  const lang = useEditor((s) => s.lang);
  const toggleLang = useEditor((s) => s.toggleLang);
  const file = activeFile ? fileById(activeFile) : null;

  return (
    <div
      data-tour="statusbar"
      className="flex h-[22px] shrink-0 items-center justify-between bg-vsc-statusbar text-[12px] text-white no-select"
    >
      <div className="flex items-center">
        <a
          href={GITHUB}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 px-2 hover:bg-white/15"
        >
          <GitBranch size={13} /> main
        </a>
        <button onClick={toggleTerminal} className="flex items-center gap-1 px-2 hover:bg-white/15">
          <RefreshCw size={12} />
        </button>
        <span className="flex items-center gap-2 px-2">
          <span className="flex items-center gap-0.5">
            <X size={12} /> 0
          </span>
          <span className="flex items-center gap-0.5">
            <Check size={12} /> 0
          </span>
        </span>
      </div>

      <div className="flex items-center">
        <LiveTicker />
        <span className="px-2">Ln 1, Col 1</span>
        <span className="px-2">Spaces: 2</span>
        <span className="px-2">UTF-8</span>
        <span className="px-2">{file?.language ?? "Plain Text"}</span>
        <button
          onClick={toggleLang}
          title={lang === "ru" ? "Switch to English" : "Переключить на русский"}
          className="flex items-center gap-1 px-2 hover:bg-white/15"
        >
          <Languages size={13} /> {lang === "ru" ? "RU" : "EN"}
        </button>
        <AchievementsButton />
        <ThemeSwitcher />
        <a
          href={GITHUB}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 px-2 hover:bg-white/15"
        >
          <Code2 size={13} /> YpCIIIaK
        </a>
        <span className="px-2">
          <Bell size={13} />
        </span>
      </div>
    </div>
  );
}
