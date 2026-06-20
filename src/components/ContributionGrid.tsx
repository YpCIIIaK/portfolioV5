"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface Day {
  date: string;
  gh: number;
  gf: number;
  total: number;
}
interface DTO {
  days: Day[];
  github: { total: number; available: boolean };
  gitflic: { total: number; configured: boolean; error: string | null };
  combinedTotal: number;
}

const EMPTY = "#262626";
// 4-step palettes (level 1..4)
const GREEN = ["#0e4429", "#006d32", "#26a641", "#39d353"];
const PURPLE = ["#3b2a57", "#5a3a8a", "#7e52c0", "#a371f7"];
const TEAL = ["#0e4d4d", "#067a6e", "#15a392", "#2ee6c5"];

function colorFor(d: Day, max: number): string {
  if (d.total === 0) return EMPTY;
  const lvl = Math.min(4, Math.ceil((d.total / max) * 4)) - 1;
  if (d.gh > 0 && d.gf > 0) return TEAL[lvl];
  if (d.gf > 0) return PURPLE[lvl];
  return GREEN[lvl];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ContributionGrid() {
  const [data, setData] = useState<DTO | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/contributions")
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error)
    return (
      <div className="mt-4 flex items-center gap-2 text-[13px] text-[#f48771]">
        <AlertCircle size={15} /> {error}
      </div>
    );
  if (!data)
    return (
      <div className="mt-4 flex items-center gap-2 text-[13px] text-vsc-muted">
        <Loader2 size={15} className="animate-spin" /> Собираю коммиты с GitHub и GitFlic…
      </div>
    );

  // group days into week columns (each column = Sun..Sat)
  const weeks: (Day | null)[][] = [];
  let week: (Day | null)[] = [];
  const firstDow = new Date(data.days[0].date).getUTCDay();
  for (let i = 0; i < firstDow; i++) week.push(null); // pad first week
  for (const d of data.days) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const max = Math.max(1, ...data.days.map((d) => d.total));

  // month labels: mark the week index where a new month starts
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, ci) => {
    const firstReal = w.find((d) => d);
    if (!firstReal) return;
    const m = new Date(firstReal.date).getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: ci, label: MONTHS[m] });
      lastMonth = m;
    }
  });

  return (
    <div className="mt-3">
      {/* totals */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[12px]">
        <span className="font-semibold text-vsc-bright">{data.combinedTotal}</span>
        <span className="text-vsc-muted">контрибуций за год</span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GREEN[3] }} /> GitHub {data.github.total}
        </span>
        {data.gitflic.total > 0 && (
          <>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PURPLE[3] }} /> GitFlic {data.gitflic.total}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TEAL[3] }} /> оба
            </span>
          </>
        )}
      </div>

      {/* scrollable heatmap */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block">
          {/* month row */}
          <div className="mb-1 ml-7 flex">
            {weeks.map((_, ci) => {
              const m = monthLabels.find((x) => x.col === ci);
              return (
                <div key={ci} className="w-[13px] text-[9px] text-vsc-muted">
                  {m ? m.label : ""}
                </div>
              );
            })}
          </div>
          <div className="flex">
            {/* weekday labels */}
            <div className="mr-1 flex w-6 flex-col justify-between py-[1px] text-[9px] text-vsc-muted">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            {/* week columns */}
            <div className="flex gap-[3px]">
              {weeks.map((w, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {w.map((d, ri) =>
                    d ? (
                      <div
                        key={ri}
                        title={`${d.date}: ${d.total} (GitHub ${d.gh} · GitFlic ${d.gf})`}
                        className="h-[10px] w-[10px] rounded-[2px]"
                        style={{ background: colorFor(d, max) }}
                      />
                    ) : (
                      <div key={ri} className="h-[10px] w-[10px]" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
