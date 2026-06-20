"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { useEditor } from "@/lib/store";

const THEMES = [
  { id: "dark-plus", name: "Dark+ (default)", swatch: "#1e1e1e" },
  { id: "light", name: "Light+", swatch: "#ffffff" },
  { id: "monokai", name: "Monokai", swatch: "#272822" },
  { id: "dracula", name: "Dracula", swatch: "#bd93f9" },
];

export function ThemeSwitcher() {
  const theme = useEditor((s) => s.theme);
  const setTheme = useEditor((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (id: string) => {
    setTheme(id);
    setOpen(false);
  };

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-[3px] hover:bg-white/15"
        title="Сменить тему"
      >
        <Palette size={13} /> {current.name.split(" ")[0]}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 w-48 overflow-hidden rounded border border-vsc-line bg-[var(--vsc-sidebar)] py-1 text-vsc-text shadow-2xl">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-vsc-hover"
            >
              <span
                className="h-3.5 w-3.5 rounded-sm border border-black/30"
                style={{ background: t.swatch }}
              />
              <span className="flex-1">{t.name}</span>
              {t.id === theme && <Check size={14} className="text-vsc-green" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
