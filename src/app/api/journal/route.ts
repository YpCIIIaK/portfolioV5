import { NextResponse } from "next/server";

/**
 * Public "engineering journal": a live activity feed built from GitHub events
 * (pushes, PRs, releases, branches, issues). Each entry is tagged `prod` so the
 * UI can filter out low-signal noise (chore/docs/wip/merge…).
 *
 * Cached 1h to respect GitHub's unauthenticated rate limit.
 */

const USER = "YpCIIIaK";
const GH = "https://api.github.com";

export type JournalKind = "ship" | "fix" | "commit" | "pr" | "release" | "branch" | "issue";

export interface JournalEntry {
  id: string;
  kind: JournalKind;
  verb: string; // "Shipped", "Fixed", "Opened PR", …
  title: string;
  repo: string;
  url: string | null;
  date: string; // ISO
  prod: boolean;
}

interface GhEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: Record<string, unknown>;
}

const NOISE = /^(merge|chore|docs?|style|wip|typo|format|fmt|ci|build|bump|deps?|revert|test)\b|^\W*$|^(update|fix typo)\b/i;
const FEATURE = /^(feat|feature)\b/i;
const FIX = /^(fix|bugfix|hotfix|perf)\b/i;

function isProdCommit(msg: string): boolean {
  const first = msg.split("\n")[0].trim();
  if (NOISE.test(first)) return false;
  return first.length > 8; // skip ultra-trivial one-word commits
}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-vscode",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`${GH}${path}`, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json() as Promise<T>;
}

export async function GET() {
  try {
    const events = await gh<GhEvent[]>(`/users/${USER}/events/public?per_page=100`);
    const items: JournalEntry[] = [];

    for (const e of events) {
      const repo = e.repo.name.split("/").pop() ?? e.repo.name;
      const p = e.payload;

      switch (e.type) {
        case "PushEvent": {
          const commits = (p.commits as { message: string; sha: string }[] | undefined) ?? [];
          for (const c of commits) {
            const msg = c.message.split("\n")[0].trim();
            if (!msg) continue;
            const prod = isProdCommit(c.message);
            items.push({
              id: `${e.id}-${c.sha}`,
              kind: FEATURE.test(msg) ? "ship" : FIX.test(msg) ? "fix" : "commit",
              verb: FEATURE.test(msg) ? "Shipped" : FIX.test(msg) ? "Fixed" : "Committed",
              title: msg.replace(/^(feat|fix|perf|refactor|chore|docs|style)(\([^)]*\))?:\s*/i, ""),
              repo,
              url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
              date: e.created_at,
              prod,
            });
          }
          break;
        }
        case "PullRequestEvent": {
          const action = p.action as string;
          const pr = p.pull_request as { title: string; html_url: string; merged: boolean } | undefined;
          if (!pr || (action !== "opened" && action !== "closed")) break;
          const merged = action === "closed" && pr.merged;
          items.push({
            id: `${e.id}-pr`,
            kind: "pr",
            verb: merged ? "Merged PR" : action === "opened" ? "Opened PR" : "Closed PR",
            title: pr.title,
            repo,
            url: pr.html_url,
            date: e.created_at,
            prod: true,
          });
          break;
        }
        case "ReleaseEvent": {
          const rel = p.release as { name: string | null; tag_name: string; html_url: string } | undefined;
          if (!rel) break;
          items.push({
            id: `${e.id}-rel`,
            kind: "release",
            verb: "Released",
            title: rel.name || rel.tag_name,
            repo,
            url: rel.html_url,
            date: e.created_at,
            prod: true,
          });
          break;
        }
        case "CreateEvent": {
          if (p.ref_type !== "branch" && p.ref_type !== "tag") break;
          items.push({
            id: `${e.id}-create`,
            kind: "branch",
            verb: `Created ${p.ref_type}`,
            title: String(p.ref ?? ""),
            repo,
            url: `https://github.com/${e.repo.name}`,
            date: e.created_at,
            prod: false,
          });
          break;
        }
        case "IssuesEvent": {
          const action = p.action as string;
          const issue = p.issue as { title: string; html_url: string } | undefined;
          if (!issue || (action !== "opened" && action !== "closed")) break;
          items.push({
            id: `${e.id}-issue`,
            kind: "issue",
            verb: action === "closed" ? "Closed issue" : "Opened issue",
            title: issue.title,
            repo,
            url: issue.html_url,
            date: e.created_at,
            prod: action === "closed",
          });
          break;
        }
      }
    }

    return NextResponse.json({ items: items.slice(0, 80) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "journal fetch failed" },
      { status: 502 }
    );
  }
}
