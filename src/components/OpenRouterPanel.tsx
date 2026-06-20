"use client";

import { DollarSign, Cpu, Layers, Trophy } from "lucide-react";
import { OPENROUTER, OR_MODELS } from "@/lib/openrouter-usage";

const compact = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n);

const money = (n: number) => (n >= 1 ? "$" + n.toFixed(2) : n > 0 ? "$" + n.toFixed(3) : "$0");

export function OpenRouterPanel() {
  const o = OPENROUTER;
  const top = OR_MODELS.slice(0, 12);
  const maxTok = Math.max(...top.map((m) => m.tokens));

  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<DollarSign size={13} />} label="Потрачено" value={"$" + o.totalCost.toFixed(2)} sub="за год" />
        <Stat icon={<Cpu size={13} />} label="Токенов" value={compact(o.totalTokens)} sub="всего" />
        <Stat icon={<Layers size={13} />} label="Моделей" value={String(o.models)} sub="перепробовано" />
        <Stat icon={<Trophy size={13} />} label="Чаще всего" value="Owl Alpha" sub="по токенам" />
      </div>

      {/* top models by tokens */}
      <div className="mt-6">
        <div className="mb-2 text-[12px] text-vsc-muted">Топ моделей по токенам</div>
        <div className="space-y-1.5">
          {top.map((m) => (
            <div key={m.model} className="flex items-center gap-3 text-[12px]">
              <span className="w-44 shrink-0 truncate text-vsc-muted" title={m.model}>{m.model}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-[var(--vsc-line)]">
                <div className="h-full rounded-sm bg-vsc-accent/70" style={{ width: (m.tokens / maxTok) * 100 + "%" }} />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-vsc-bright">{compact(m.tokens)}</span>
              <span className="w-14 shrink-0 text-right font-mono text-vsc-muted">{money(m.cost)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-vsc-muted">
          OpenRouter — это рантайм AI-ассистента сайта и площадка, где я гонял разные модели
          (Qwen, GLM, Gemini, DeepSeek, Kimi…). Много токенов на бесплатных/дешёвых моделях, поэтому
          расход в десятки раз ниже, чем у премиум-агента Claude Code.
        </p>
      </div>

      <p className="mt-5 border-t border-vsc-line pt-3 text-[11px] leading-relaxed text-vsc-muted">
        Источник: экспорт <span className="font-mono text-vsc-text">OpenRouter · Activity</span> · снимок {o.capturedAt} ·
        период {o.rangeStart} → {o.rangeEnd}. Цифры настоящие.
      </p>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-vsc-line bg-[var(--vsc-bg)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-vsc-muted">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-vsc-bright">{value}</div>
      <div className="text-[11px] text-vsc-muted">{sub}</div>
    </div>
  );
}
