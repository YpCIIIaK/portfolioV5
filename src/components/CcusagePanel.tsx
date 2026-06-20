"use client";

import { DollarSign, Cpu, Bot, Clock } from "lucide-react";
import { CCUSAGE } from "@/lib/ccusage";

const compact = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n);

export function CcusagePanel() {
  const c = CCUSAGE;
  const maxCost = Math.max(...c.daily.map((d) => d.cost));

  const tokenRows: { label: string; value: number; hint?: string }[] = [
    { label: "Input", value: c.inputTokens },
    { label: "Output", value: c.outputTokens },
    { label: "Cache write", value: c.cacheCreateTokens },
    { label: "Cache read", value: c.cacheReadTokens, hint: "переиспользованный контекст" },
  ];
  const maxTok = Math.max(...tokenRows.map((r) => r.value));

  return (
    <div className="mt-2">
      {/* headline cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<DollarSign size={13} />} label="Потрачено" value={"$" + Math.round(c.totalCost)} sub={c.days + " дней"} />
        <Stat icon={<Cpu size={13} />} label="Токенов" value={compact(c.totalTokens)} sub="всего" />
        <Stat icon={<Bot size={13} />} label="Модель" value="Opus 4.8" sub="основная" />
        <Stat icon={<Clock size={13} />} label="Пик за день" value={"$" + Math.round(maxCost)} sub={c.peakDay} />
      </div>

      {/* daily cost bar chart */}
      <div className="mt-6">
        <div className="mb-2 text-[12px] text-vsc-muted">Расход по дням, USD</div>
        <div className="flex h-28 items-end gap-[3px]">
          {c.daily.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: $${d.cost.toFixed(2)} · ${compact(d.tokens)} токенов`}
              className="flex-1 rounded-t-sm bg-vsc-accent/60 transition-colors hover:bg-vsc-accent"
              style={{ height: Math.max(4, (d.cost / maxCost) * 100) + "%" }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-vsc-muted">
          <span>{c.rangeStart}</span>
          <span>{c.rangeEnd}</span>
        </div>
      </div>

      {/* token breakdown */}
      <div className="mt-6">
        <div className="mb-2 text-[12px] text-vsc-muted">Разбивка по токенам</div>
        <div className="space-y-1.5">
          {tokenRows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-[12px]">
              <span className="w-24 shrink-0 text-vsc-muted">{r.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-[var(--vsc-line)]">
                <div className="h-full rounded-sm bg-vsc-accent/70" style={{ width: (r.value / maxTok) * 100 + "%" }} />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-vsc-bright">{compact(r.value)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-vsc-muted">
          ~823M из них — <span className="text-vsc-text">cache read</span>: Claude Code переиспользует контекст между шагами,
          поэтому реальная стоимость заметно ниже наивной оценки «токены × цена».
        </p>
      </div>

      {/* models */}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-vsc-muted">Модели:</span>
        {c.models.map((m) => (
          <span key={m} className="rounded-full border border-vsc-line bg-[var(--vsc-bg)] px-2 py-0.5 font-mono text-[11px] text-vsc-light-blue">
            {m}
          </span>
        ))}
      </div>

      {/* footer */}
      <p className="mt-5 border-t border-vsc-line pt-3 text-[11px] leading-relaxed text-vsc-muted">
        Источник: <span className="font-mono text-vsc-text">npx ccusage daily --json</span> · снимок {c.capturedAt} · считает
        локальные логи Claude Code. Цифры настоящие — это не моковые данные.
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
