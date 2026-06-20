import { NextResponse } from "next/server";

const USER = "YpCIIIaK";
const GH = "https://api.github.com";

interface Repo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  fork: boolean;
  archived: boolean;
}

/** Cached for 1h so we don't hit GitHub's 60 req/h unauthenticated limit. */
async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-vscode",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`${GH}${path}`, {
    headers,
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json() as Promise<T>;
}

export async function GET() {
  try {
    const [profile, repos] = await Promise.all([
      gh<{
        public_repos: number;
        followers: number;
        following: number;
        avatar_url: string;
        name: string | null;
        bio: string | null;
        html_url: string;
        created_at: string;
      }>(`/users/${USER}`),
      gh<Repo[]>(`/users/${USER}/repos?per_page=100&sort=updated`),
    ]);

    const owned = repos.filter((r) => !r.fork);
    const totalStars = owned.reduce((a, r) => a + r.stargazers_count, 0);

    // language distribution across owned repos
    const langCount: Record<string, number> = {};
    for (const r of owned) {
      if (r.language) langCount[r.language] = (langCount[r.language] ?? 0) + 1;
    }
    const languages = Object.entries(langCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topRepos = owned
      .filter((r) => !r.archived)
      .sort(
        (a, b) =>
          b.stargazers_count - a.stargazers_count ||
          +new Date(b.updated_at) - +new Date(a.updated_at)
      )
      .slice(0, 8)
      .map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        updated: r.updated_at,
      }));

    return NextResponse.json({
      profile: {
        name: profile.name,
        bio: profile.bio,
        avatar: profile.avatar_url,
        url: profile.html_url,
        followers: profile.followers,
        following: profile.following,
        publicRepos: profile.public_repos,
        since: profile.created_at,
      },
      totalStars,
      languages,
      topRepos,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GitHub fetch failed" },
      { status: 502 }
    );
  }
}
