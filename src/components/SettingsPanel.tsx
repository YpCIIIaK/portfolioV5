"use client";

import { useState } from "react";
import { Check, AlertCircle, RotateCcw } from "lucide-react";
import { useEditor } from "@/lib/store";

const THEME_IDS = ["dark-plus", "light", "monokai", "dracula"];

/** A real, editable settings.json that drives the live site state. */
export function SettingsPanel() {
  const theme = useEditor((s) => s.theme);
  const fontSize = useEditor((s) => s.fontSize);
  const minimapOpen = useEditor((s) => s.minimapOpen);
  const sidebarOpen = useEditor((s) => s.sidebarOpen);
  const terminalOpen = useEditor((s) => s.terminalOpen);

  const setTheme = useEditor((s) => s.setTheme);
  const setFontSize = useEditor((s) => s.setFontSize);
  const setMinimap = useEditor((s) => s.setMinimap);
  const setSidebar = useEditor((s) => s.setSidebar);
  const setTerminal = useEditor((s) => s.setTerminal);

  const canonical = JSON.stringify(
    {
      "workbench.colorTheme": theme,
      "editor.fontSize": fontSize,
      "editor.minimap.enabled": minimapOpen,
      "workbench.sideBar.visible": sidebarOpen,
      "terminal.integrated.visible": terminalOpen,
    },
    null,
    2
  );

  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (text: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError("Невалидный JSON: " + (e as Error).message);
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setError("Ожидался объект { ... }");
      return;
    }
    const obj = parsed as Record<string, unknown>;

    const t = obj["workbench.colorTheme"];
    if (t !== undefined) {
      if (typeof t !== "string" || !THEME_IDS.includes(t)) {
        setError(`"workbench.colorTheme": ${THEME_IDS.map((x) => `"${x}"`).join(" | ")}`);
        return;
      }
      if (t !== theme) setTheme(t);
    }

    const fs = obj["editor.fontSize"];
    if (fs !== undefined) {
      if (typeof fs !== "number") {
        setError('"editor.fontSize" должен быть числом (12–20)');
        return;
      }
      if (Math.min(20, Math.max(12, Math.round(fs))) !== fontSize) setFontSize(fs);
    }

    const checks: [string, boolean, (v: boolean) => void, boolean][] = [
      ["editor.minimap.enabled", minimapOpen, setMinimap, true],
      ["workbench.sideBar.visible", sidebarOpen, setSidebar, true],
      ["terminal.integrated.visible", terminalOpen, setTerminal, true],
    ];
    for (const [key, cur, setter] of checks) {
      const v = obj[key];
      if (v === undefined) continue;
      if (typeof v !== "boolean") {
        setError(`"${key}" должен быть true / false`);
        return;
      }
      if (v !== cur) setter(v);
    }

    setError(null);
  };

  const onChange = (v: string) => {
    setDraft(v);
    apply(v);
  };
  const onBlur = () => {
    if (!error) setDraft(null);
  };
  const reset = () => {
    setTheme("dark-plus");
    setFontSize(14);
    setMinimap(true);
    setSidebar(true);
    setTerminal(false);
    setDraft(null);
    setError(null);
  };

  const value = draft !== null ? draft : canonical;

  return (
    <div className="mt-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-vsc-muted">.vscode/settings.json — редактируй и смотри на сайт</span>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
        >
          <RotateCcw size={12} /> Сбросить
        </button>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        spellCheck={false}
        rows={value.split("\n").length + 1}
        className={`w-full resize-none rounded border bg-[var(--vsc-bg)] p-3 font-mono text-[13px] leading-relaxed text-vsc-text outline-none ${
          error ? "border-[#f48771]" : "border-vsc-line focus:border-vsc-accent"
        }`}
      />

      <div className={`mt-2 flex items-start gap-1.5 text-[12px] ${error ? "text-[#f48771]" : "text-vsc-green"}`}>
        {error ? <AlertCircle size={14} className="mt-px shrink-0" /> : <Check size={14} className="mt-px shrink-0" />}
        <span>{error ?? "Настройки применены — сайт обновляется на лету."}</span>
      </div>

      <div className="mt-4 space-y-1 text-[11px]">
        <Legend k="workbench.colorTheme" v={'"dark-plus" | "light" | "monokai" | "dracula"'} />
        <Legend k="editor.fontSize" v="число 12–20" />
        <Legend k="editor.minimap.enabled" v="true | false" />
        <Legend k="workbench.sideBar.visible" v="true | false" />
        <Legend k="terminal.integrated.visible" v="true | false" />
      </div>
    </div>
  );
}

function Legend({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <span className="font-mono text-vsc-light-blue">&quot;{k}&quot;</span>
      <span className="text-vsc-muted">→ {v}</span>
    </div>
  );
}
