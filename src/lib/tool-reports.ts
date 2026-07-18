/**
 * Storage for reports pushed in by external, self-hosted tools (repo-janitor
 * health scans, …). The heavy computation happens elsewhere (local CLI, GitHub
 * Action); here we only persist and read back the compact JSON. Server-side.
 */

import { supabaseConfigured, sbSelect, sbInsert } from "@/lib/supabase";

/** One finding category rollup inside a repo-health report. */
export interface RepoHealthCategory {
  name: string;
  severity: "critical" | "warning" | "info" | string;
  count: number;
}

/** Compact repo-janitor result — the ingest contract. */
export interface RepoHealthReport {
  repo: string; // "owner/name"
  score: number; // 0..100
  grade: string; // A..F
  scannedAt?: string; // ISO; defaults to now on ingest
  summary?: { critical?: number; warning?: number; info?: number };
  categories?: RepoHealthCategory[];
  url?: string | null; // link to the full dashboard, if hosted
}

interface ReportRow {
  id: string;
  tool: string;
  key: string;
  score: number | null;
  grade: string;
  data: RepoHealthReport;
  created_at: string;
}

const TOOL = "repo-health";

/** Persist one pushed report. */
export async function ingestRepoHealth(report: RepoHealthReport): Promise<void> {
  if (!supabaseConfigured()) throw new Error("Supabase не настроен");
  await sbInsert("ws_tool_reports", {
    tool: TOOL,
    key: report.repo,
    score: report.score,
    grade: report.grade || "",
    data: { ...report, scannedAt: report.scannedAt ?? new Date().toISOString() },
  });
}

export interface RepoHealthEntry {
  repo: string;
  latest: RepoHealthReport & { scannedAt: string };
  /** Recent scores oldest→newest, for a sparkline/trend. */
  history: { score: number; grade: string; scannedAt: string }[];
}

/**
 * Latest report per repo plus a short score history. One query, grouped in JS
 * (the dataset is tiny — a handful of repos, a few scans each).
 */
export async function listRepoHealth(perRepoHistory = 12): Promise<RepoHealthEntry[]> {
  if (!supabaseConfigured()) return [];
  const rows = await sbSelect<ReportRow>(
    "ws_tool_reports",
    `select=key,score,grade,data,created_at&tool=eq.${TOOL}&order=created_at.desc&limit=500`,
  );
  const byRepo = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const list = byRepo.get(r.key) ?? [];
    list.push(r);
    byRepo.set(r.key, list);
  }
  const out: RepoHealthEntry[] = [];
  for (const [repo, list] of byRepo) {
    const latestRow = list[0]; // rows are desc by created_at
    const history = list
      .slice(0, perRepoHistory)
      .reverse()
      .map((r) => ({ score: Number(r.score ?? 0), grade: r.grade, scannedAt: r.created_at }));
    out.push({
      repo,
      latest: { ...latestRow.data, scannedAt: latestRow.data.scannedAt ?? latestRow.created_at },
      history,
    });
  }
  // Worst grade first so problems surface at the top.
  out.sort((a, b) => (a.latest.score ?? 100) - (b.latest.score ?? 100));
  return out;
}
