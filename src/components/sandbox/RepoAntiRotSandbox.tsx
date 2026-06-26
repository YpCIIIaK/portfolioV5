"use client";

import { useEffect, useRef, useState } from "react";
import { Play, ShieldAlert, ShieldCheck, Loader2, RotateCcw } from "lucide-react";
import { useTr } from "@/lib/i18n";

/**
 * Interactive demo of the Repo Anti-Rot engine. Runs entirely client-side on
 * deterministic mock fixtures, but mirrors the real output contract:
 * a registry of scanners → weighted Findings → a 0–100 score and an A–F grade.
 */

type Severity = "critical" | "high" | "medium" | "low";

interface Finding {
  scanner: string;
  title: string;
  severity: Severity;
  note: string; // short "AI verdict"-style line
}

interface Report {
  score: number;
  grade: string;
  findings: Finding[];
}

// The 16 scanners, in run order (matches the project description).
const SCANNERS = [
  "committed-secrets", "leftover-debug", "vulnerable-deps", "outdated-deps",
  "dependency-funeral", "lockfile-drift", "dead-code", "commented-code",
  "todo-debt", "repo-bloat", "stale-branch", "bus-factor",
  "project-hygiene", "dockerfile", "broken-doc-links", "env-lifecycle",
];

const PENALTY: Record<Severity, number> = { critical: 28, high: 16, medium: 8, low: 3 };

interface Preset {
  id: string;
  label: string;
  repo: string;
  findings: Finding[];
}

const PRESETS: Preset[] = [
  {
    id: "fresh",
    label: "fresh-starter",
    repo: "acme/fresh-starter",
    findings: [
      { scanner: "outdated-deps", title: "2 minor-версии устарели", severity: "low", note: "Не критично — обновить при случае." },
      { scanner: "todo-debt", title: "3 свежих TODO", severity: "low", note: "Молодые TODO, долговая нагрузка низкая." },
    ],
  },
  {
    id: "saas",
    label: "saas-dashboard",
    repo: "acme/saas-dashboard",
    findings: [
      { scanner: "vulnerable-deps", title: "1 зависимость с CVE (high)", severity: "high", note: "lodash <4.17.21 — обнови, есть прототайп-полюшн." },
      { scanner: "dead-code", title: "~4% недостижимого кода", severity: "medium", note: "Несколько экспортов нигде не импортируются." },
      { scanner: "commented-code", title: "12 блоков закомментированного кода", severity: "low", note: "История есть в git — можно удалить." },
      { scanner: "stale-branch", title: "5 веток без активности >90 дней", severity: "low", note: "Похоже на брошенные фичи." },
      { scanner: "dockerfile", title: "root-пользователь в контейнере", severity: "medium", note: "Добавь USER node для принципа наименьших привилегий." },
    ],
  },
  {
    id: "legacy",
    label: "legacy-monolith",
    repo: "acme/legacy-monolith",
    findings: [
      { scanner: "committed-secrets", title: "AWS-ключ в истории коммитов", severity: "critical", note: "Утёкший секрет — ротация ключа и git-filter обязательны." },
      { scanner: "vulnerable-deps", title: "7 зависимостей с CVE (2 critical)", severity: "critical", note: "Старый Express + уязвимый парсер — апдейт срочно." },
      { scanner: "dependency-funeral", title: "4 заброшенные зависимости", severity: "high", note: "Не обновлялись 3+ года, без активного мейнтейнера." },
      { scanner: "bus-factor", title: "Bus-factor = 1", severity: "high", note: "80% коммитов от одного автора — риск для проекта." },
      { scanner: "todo-debt", title: "61 TODO, старейшему 4 года", severity: "medium", note: "Технический долг копится без разбора." },
      { scanner: "repo-bloat", title: "180 МБ бинарей в git", severity: "medium", note: "Артефакты сборки в истории раздувают clone." },
      { scanner: "broken-doc-links", title: "9 битых ссылок в доках", severity: "low", note: "README ведёт на удалённые страницы." },
    ],
  },
];

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

function buildReport(p: Preset): Report {
  const score = Math.max(0, p.findings.reduce((acc, f) => acc - PENALTY[f.severity], 100));
  return { score, grade: grade(score), findings: p.findings };
}

const SEV_COLOR: Record<Severity, string> = {
  critical: "text-red-400 border-red-400/40 bg-red-400/10",
  high: "text-orange-400 border-orange-400/40 bg-orange-400/10",
  medium: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  low: "text-vsc-muted border-vsc-line bg-[#2d2d2d]",
};

function gradeColor(g: string): string {
  if (g === "A") return "text-green-400";
  if (g === "B") return "text-lime-400";
  if (g === "C") return "text-yellow-400";
  if (g === "D") return "text-orange-400";
  return "text-red-400";
}

export function RepoAntiRotSandbox() {
  const tr = useTr();
  const [preset, setPreset] = useState<Preset>(PRESETS[1]);
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [activeScanner, setActiveScanner] = useState(-1);
  const [report, setReport] = useState<Report | null>(null);
  const [shownScore, setShownScore] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("scanning");
    setReport(null);
    setShownScore(0);
    setActiveScanner(0);

    const step = (i: number) => {
      if (i >= SCANNERS.length) {
        const r = buildReport(preset);
        setReport(r);
        setPhase("done");
        // count-up the score
        let s = 0;
        const countUp = () => {
          s = Math.min(r.score, s + 3);
          setShownScore(s);
          if (s < r.score) timer.current = setTimeout(countUp, 20);
        };
        countUp();
        return;
      }
      setActiveScanner(i);
      timer.current = setTimeout(() => step(i + 1), 90);
    };
    step(0);
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("idle");
    setReport(null);
    setActiveScanner(-1);
  };

  return (
    <div className="mt-2 rounded-lg border border-vsc-line bg-[#1e1e1e]">
      {/* console header */}
      <div className="flex items-center gap-2 border-b border-vsc-line px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </span>
        <span className="font-mono text-[12px] text-vsc-muted">repo-anti-rot — {tr("живое демо")}</span>
      </div>

      <div className="p-4">
        {/* preset picker + run */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-vsc-muted">{tr("Репозиторий:")}</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPreset(p); reset(); }}
              disabled={phase === "scanning"}
              className={`rounded border px-2 py-1 font-mono text-[12px] transition disabled:opacity-50 ${
                preset.id === p.id ? "border-vsc-accent bg-vsc-accent/15 text-vsc-bright" : "border-vsc-line text-vsc-muted hover:text-vsc-text"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {phase === "done" && (
              <button onClick={reset} className="flex items-center gap-1 rounded border border-vsc-line px-2 py-1 text-[12px] text-vsc-muted hover:text-vsc-text">
                <RotateCcw size={13} /> {tr("Сброс")}
              </button>
            )}
            <button
              onClick={run}
              disabled={phase === "scanning"}
              className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {phase === "scanning" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {phase === "scanning" ? tr("Сканирую…") : tr("Запустить скан")}
            </button>
          </div>
        </div>

        {/* scanner grid */}
        <div className="mb-4 grid grid-cols-2 gap-1 sm:grid-cols-4">
          {SCANNERS.map((s, i) => {
            const state =
              phase === "idle" ? "idle"
              : phase === "done" ? "done"
              : i < activeScanner ? "done" : i === activeScanner ? "active" : "idle";
            return (
              <div
                key={s}
                className={`truncate rounded px-2 py-1 font-mono text-[10.5px] transition ${
                  state === "active" ? "bg-vsc-accent/20 text-vsc-bright"
                  : state === "done" ? "text-vsc-green" : "text-vsc-muted"
                }`}
              >
                {state === "done" ? "✓ " : state === "active" ? "⟳ " : "· "}{s}
              </div>
            );
          })}
        </div>

        {/* report */}
        {report && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded border border-vsc-line bg-[#252526] px-4 py-3">
              <div className={`text-4xl font-bold ${gradeColor(report.grade)}`}>{report.grade}</div>
              <div>
                <div className="text-[22px] font-semibold text-vsc-bright">{shownScore}<span className="text-[14px] text-vsc-muted">/100</span></div>
                <div className="flex items-center gap-1 text-[12px] text-vsc-muted">
                  {report.score >= 80 ? <ShieldCheck size={13} className="text-green-400" /> : <ShieldAlert size={13} className="text-orange-400" />}
                  {report.findings.length} {tr("находок")} · {preset.repo}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {report.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2 rounded border border-vsc-line bg-[#252526] px-3 py-2">
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${SEV_COLOR[f.severity]}`}>
                    {f.severity}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] text-vsc-text">
                      <span className="font-mono text-[11px] text-vsc-light-blue">{f.scanner}</span> — {f.title}
                    </div>
                    <div className="text-[12px] text-vsc-muted">{f.note}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-vsc-muted">{tr("Демо на фикстурах. Реальный движок клонирует и сканирует любой репозиторий через /api/scan.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
