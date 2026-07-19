"use client";

import { useCallback, useEffect, useState } from "react";
import { HeartPulse, RefreshCw, ArrowLeft, ExternalLink, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { getCached, setCached, invalidate } from "@/lib/cache";

/** Client mirrors of /api/tools/repo-health shapes. */
interface Category { name: string; severity: string; count: number }
interface Report {
  repo: string;
  score: number;
  grade: string;
  scannedAt: string;
  summary?: { critical?: number; warning?: number; info?: number };
  categories?: Category[];
  url?: string | null;
}
interface Entry {
  repo: string;
  latest: Report;
  history: { score: number; grade: string; scannedAt: string }[];
}

const CACHE_KEY = "tools:repo-health";

/** Grade → colour (A green … F red). */
function gradeColor(grade: string): string {
  return (
    { A: "#4ade80", B: "#a3e635", C: "#fbbf24", D: "#fb923c", F: "#f87171" } as Record<string, string>
  )[grade?.toUpperCase()] ?? "#8b8b8b";
}

function scoreColor(score: number): string {
  if (score >= 90) return "#4ade80";
  if (score >= 75) return "#a3e635";
  if (score >= 60) return "#fbbf24";
  if (score >= 40) return "#fb923c";
  return "#f87171";
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

const SEV_ICON: Record<string, typeof Info> = { critical: ShieldAlert, warning: AlertTriangle, info: Info };
const SEV_COLOR: Record<string, string> = { critical: "#f87171", warning: "#fbbf24", info: "#60a5fa" };

/** Compact grade badge. */
function GradeBadge({ grade, size = 34 }: { grade: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg font-bold text-black"
      style={{ width: size, height: size, backgroundColor: gradeColor(grade), fontSize: size * 0.45 }}
    >
      {grade?.toUpperCase() || "—"}
    </span>
  );
}

/** Tiny bar sparkline of recent scores. */
function Trend({ history }: { history: Entry["history"] }) {
  if (history.length < 2) return null;
  return (
    <div className="flex h-8 items-end gap-0.5">
      {history.map((h, i) => (
        <span
          key={i}
          title={`${h.score} · ${when(h.scannedAt)}`}
          className="w-1.5 rounded-sm"
          style={{ height: `${Math.max(8, h.score)}%`, backgroundColor: scoreColor(h.score) }}
        />
      ))}
    </div>
  );
}

export function RepoHealthPanel() {
  const [items, setItems] = useState<Entry[]>(() => getCached<Entry[]>(CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY));
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Entry | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const reload = useCallback(() => {
    invalidate(CACHE_KEY);
    setLoading(true);
    setError("");
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (getCached(CACHE_KEY)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tools/repo-health");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (!cancelled) {
          setItems(json.items);
          setCached(CACHE_KEY, json.items);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchKey]);

  // ---- detail view ----
  if (open) {
    const r = open.latest;
    return (
      <div className="mx-auto max-w-5xl px-8 py-5">
        <button onClick={() => setOpen(null)} className="mb-4 flex items-center gap-1.5 text-[13px] text-vsc-muted hover:text-vsc-text">
          <ArrowLeft size={15} /> К списку
        </button>

        <div className="mb-4 flex items-center gap-3">
          <GradeBadge grade={r.grade} size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] font-semibold text-vsc-bright">{open.repo}</h1>
            <div className="text-[12px] text-vsc-muted">Скан {when(r.scannedAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-bold" style={{ color: scoreColor(r.score) }}>{Math.round(r.score)}</div>
            <div className="text-[11px] text-vsc-muted">из 100</div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4 rounded-lg border border-vsc-line bg-vsc-sidebar p-4">
          {(["critical", "warning", "info"] as const).map((sev) => {
            const Icon = SEV_ICON[sev];
            const n = r.summary?.[sev] ?? 0;
            return (
              <div key={sev} className="flex items-center gap-1.5">
                <Icon size={15} style={{ color: SEV_COLOR[sev] }} />
                <span className="text-[14px] font-medium text-vsc-text">{n}</span>
                <span className="text-[11px] text-vsc-muted">
                  {sev === "critical" ? "критич." : sev === "warning" ? "предупр." : "инфо"}
                </span>
              </div>
            );
          })}
          {open.history.length >= 2 && <div className="ml-auto"><Trend history={open.history} /></div>}
        </div>

        <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-vsc-muted">Категории</div>
        {r.categories && r.categories.length ? (
          <div className="divide-y divide-vsc-line">
            {r.categories.map((c, i) => (
              <div key={i} className="flex items-center gap-2.5 px-1 py-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SEV_COLOR[c.severity] || "#8b8b8b" }} />
                <span className="flex-1 truncate text-[13px] text-vsc-text">{c.name}</span>
                <span className="text-[12px] text-vsc-muted">{c.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-vsc-muted">Находок нет — чисто.</p>
        )}

        {r.url && (
          <a href={r.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-vsc-light-blue hover:text-vsc-bright">
            <ExternalLink size={14} /> Полный дашборд
          </a>
        )}
      </div>
    );
  }

  // ---- list view ----
  return (
    <div className="mx-auto max-w-5xl px-8 py-5">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <HeartPulse size={18} /> Repo Health
        </h1>
        <button onClick={reload} title="Обновить" className="rounded p-1.5 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="mb-4 text-[12px] text-vsc-muted">
        Отчёты repo-janitor. Сканы гоняются локально/в CI и присылаются сюда — сервер их только показывает.
      </p>

      {error && <p className="mb-3 text-[13px] text-vsc-yellow">{error}</p>}
      {loading ? (
        <p className="text-[13px] text-vsc-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-vsc-line px-4 py-6 text-[13px] text-vsc-muted">
          Пока нет отчётов. Настрой repo-janitor слать результат на{" "}
          <code className="text-vsc-text">/api/tools/repo-health/ingest</code> с заголовком{" "}
          <code className="text-vsc-text">x-tools-secret</code>.
        </div>
      ) : (
        <div className="divide-y divide-vsc-line">
          {items.map((e) => (
            <button key={e.repo} onClick={() => setOpen(e)} className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-vsc-hover">
              <GradeBadge grade={e.latest.grade} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-vsc-text">{e.repo}</div>
                <div className="flex items-center gap-2 text-[11px] text-vsc-muted">
                  <span style={{ color: scoreColor(e.latest.score) }}>{Math.round(e.latest.score)}/100</span>
                  <span>· {when(e.latest.scannedAt)}</span>
                  {(e.latest.summary?.critical ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5" style={{ color: SEV_COLOR.critical }}>
                      <ShieldAlert size={11} /> {e.latest.summary?.critical}
                    </span>
                  )}
                </div>
              </div>
              <Trend history={e.history} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
