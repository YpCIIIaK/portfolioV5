"use client";

import { Terminal, Network } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { CcusagePanel } from "./CcusagePanel";
import { OpenRouterPanel } from "./OpenRouterPanel";

export function AiUsagePanel() {
  const tr = useTr();
  return (
    <div className="mt-2 space-y-10">
      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-vsc-bright">
          <Terminal size={16} className="text-vsc-accent" />
          {tr("Claude Code — агент, которым собран сайт")}
        </h2>
        <CcusagePanel />
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-vsc-bright">
          <Network size={16} className="text-vsc-accent" />
          {tr("OpenRouter — ассистент сайта и эксперименты с моделями")}
        </h2>
        <OpenRouterPanel />
      </section>
    </div>
  );
}
