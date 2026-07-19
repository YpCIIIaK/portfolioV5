/**
 * Minimal GitHub REST client for the assistant's write tools — server-side only.
 *
 * Auth is a single Personal Access Token (GITHUB_PAT) with the `repo` scope,
 * acting as the owner. This is separate from the login OAuth token (which only
 * has `read:user` and isn't stored): the assistant creates repos/issues as the
 * owner, and the callers (workspace chat, Telegram bot) are already owner-gated.
 */

const API = "https://api.github.com";

export function githubConfigured(): boolean {
  return !!process.env.GITHUB_PAT;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_PAT}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "portfolio-assistant",
  };
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: headers(), cache: "no-store" });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(`GitHub ${res.status}: ${(detail as { message?: string }).message || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

let cachedLogin = "";
/** The authenticated PAT owner's login (cached for the process lifetime). */
export async function authedLogin(): Promise<string> {
  if (cachedLogin) return cachedLogin;
  const me = await gh<{ login: string }>("/user");
  cachedLogin = me.login;
  return cachedLogin;
}

export interface RepoResult {
  full_name: string;
  html_url: string;
  private: boolean;
}

export async function createRepo(opts: {
  name: string;
  description?: string;
  isPrivate?: boolean;
  autoInit?: boolean;
}): Promise<RepoResult> {
  return gh<RepoResult>("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      description: opts.description || "",
      private: opts.isPrivate ?? true,
      auto_init: opts.autoInit ?? true,
    }),
  });
}

export interface IssueResult {
  number: number;
  html_url: string;
  title: string;
}

/** Create an issue. `repo` may be "name" (owner assumed) or "owner/name". */
export async function createIssue(opts: {
  repo: string;
  title: string;
  body?: string;
}): Promise<IssueResult> {
  const slug = opts.repo.includes("/") ? opts.repo : `${await authedLogin()}/${opts.repo}`;
  return gh<IssueResult>(`/repos/${slug}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: opts.title, body: opts.body || "" }),
  });
}

export interface RepoBrief {
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  updated_at: string;
}

/** List the owner's repositories, most recently pushed first. */
export async function listRepos(limit = 20): Promise<RepoBrief[]> {
  const rows = await gh<RepoBrief[]>(`/user/repos?sort=pushed&per_page=${Math.min(Math.max(limit, 1), 100)}&affiliation=owner`);
  return rows;
}

export interface RepoForImport {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  private: boolean;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

interface RepoRaw {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  private: boolean;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

/**
 * Full list of the owner's repos for the "import as project" picker — richer
 * than listRepos (language, topics, stars) and paginated to cover everything.
 */
export async function listReposForImport(): Promise<RepoForImport[]> {
  const out: RepoForImport[] = [];
  for (let page = 1; page <= 5; page++) {
    const rows = await gh<RepoRaw[]>(`/user/repos?sort=pushed&per_page=100&page=${page}&affiliation=owner`);
    for (const r of rows) {
      out.push({
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        description: r.description,
        language: r.language,
        topics: r.topics ?? [],
        stars: r.stargazers_count,
        private: r.private,
        fork: r.fork,
        archived: r.archived,
        pushed_at: r.pushed_at,
      });
    }
    if (rows.length < 100) break;
  }
  return out;
}
