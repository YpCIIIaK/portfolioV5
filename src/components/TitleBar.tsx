"use client";

import { useEditor } from "@/lib/store";

const MENUS = ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];

export function TitleBar() {
  const setPalette = useEditor((s) => s.setPalette);
  const toggleTerminal = useEditor((s) => s.toggleTerminal);
  const setTour = useEditor((s) => s.setTour);

  const onMenu = (m: string) => {
    if (m === "Terminal") toggleTerminal();
    else if (m === "Help") setTour(true);
    else if (m === "View" || m === "Go") setPalette(true);
  };

  return (
    <div className="flex h-[30px] shrink-0 items-center bg-vsc-titlebar text-[12px] text-vsc-text no-select">
      {/* macOS-style traffic lights for a familiar IDE feel */}
      <div className="flex items-center gap-2 px-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>

      <div className="flex items-center">
        {MENUS.map((m) => (
          <button
            key={m}
            onClick={() => onMenu(m)}
            className="rounded px-2 py-0.5 hover:bg-white/10"
          >
            {m}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-vsc-muted">
        portfolio — Vladimir — Visual Studio Code
      </div>
    </div>
  );
}
