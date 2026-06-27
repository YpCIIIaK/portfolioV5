"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Rocket,
  Bug,
  GitCommit,
  GitPullRequest,
  Tag,
  GitBranch,
  CircleDot,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { wsList, type Task } from "@/lib/workspace";
import { useTr } from "@/lib/i18n";
import type { JournalEntry, JournalKind } from "@/app/api/journal/route";

const ICON: Record<JournalKind, typeof Rocket> = {
  ship: Rocket,
  fix: Bug,
  commit: GitCommit,
  pr: GitPullRequest,
  release: Tag,
  branch: GitBranch,
  issue: CircleDot,
};

function dayLabel(iso: string, tr: (s: string) => string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return tr("Сегодня");
  if (d.toDateString() === yest.toDateString()) return tr("Вчера");
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function JournalPanel() {
  const tr = useTr();
  const owner = useSession((s) => !!s.user?.owner);
  const [items, setItems] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [prodOnly, setProdOnly] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await fetch("/api/journal", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: JournalEntry[] };
        let all = data.items;

        // Owner: fold in completed tasks from the personal workspace.
        if (owner) {
          try {
            const tasks = await wsList<Task>("tasks");
            const done: JournalEntry[] = tasks
              .filter((t) => t.done)
              .map((t) => ({
                id: `task-${t.id}`,
                kind: "issue",
                verb: "Closed task",
                title: t.title,
                repo: "workspace",
                url: null,
                date: t.created_at,
                prod: true,
              }));
            all = [...all, ...done].sort((a, b) => +new Date(b.date) - +new Date(a.date));
          } catch {
            /* tasks optional */
          }
        }
        if (alive) setItems(all);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [owner]);

  const groups = useMemo(() => {
    const visible = prodOnly ? items.filter((i) => i.prod) : items;
    const map = new Map<string, JournalEntry[]>();
    for (const it of visible) {
      const key = dayLabel(it.date, tr);
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [items, prodOnly, tr]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setProdOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12px] transition ${
            prodOnly ? "border-vsc-accent bg-vsc-accent/15 text-vsc-bright" : "border-vsc-line text-vsc-muted hover:text-vsc-text"
          }`}
        >
          <Filter size={13} /> {tr("Только production-grade")}
        </button>
        <span className="text-[11px] text-vsc-muted">
          {groups.reduce((n, [, e]) => n + e.length, 0)} {tr("событий")}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-vsc-muted">
          <Loader2 size={15} className="animate-spin" /> {tr("Собираю журнал из GitHub…")}
        </div>
      ) : failed ? (
        <div className="flex items-center gap-2 rounded border border-vsc-line bg-[#252526] px-3 py-2 text-[13px] text-[#f48771]">
          <AlertCircle size={15} /> {tr("Не удалось загрузить ленту активности.")}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">{tr("Пока нет событий для показа.")}</p>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, entries]) => (
            <div key={day}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">{day}</div>
              <div className="space-y-1.5">
                {entries.map((e) => {
                  const Icon = e.id.startsWith("task-") ? CheckCircle2 : ICON[e.kind];
                  const inner = (
                    <>
                      <Icon size={15} className="mt-0.5 shrink-0 text-vsc-accent" />
                      <div className="min-w-0">
                        <span className="text-[13px] text-vsc-text">
                          <span className="font-medium text-vsc-bright">{tr(e.verb)}</span> {e.title}
                        </span>
                        <span className="ml-1.5 rounded bg-[#2d2d2d] px-1.5 py-px font-mono text-[10px] text-vsc-light-blue">
                          {e.repo}
                        </span>
                      </div>
                    </>
                  );
                  return e.url ? (
                    <a
                      key={e.id}
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex gap-2 rounded px-1.5 py-1 hover:bg-vsc-hover"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={e.id} className="flex gap-2 rounded px-1.5 py-1">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
