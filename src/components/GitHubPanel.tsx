"use client";

import { useEffect, useState } from "react";
import {
  Star,
  GitFork,
  Users,
  FolderGit2,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface RepoDTO {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  updated: string;
}
interface GitHubDTO {
  profile: {
    name: string | null;
    bio: string | null;
    avatar: string;
    url: string;
    followers: number;
    following: number;
    publicRepos: number;
    since: string;
  };
  totalStars: number;
  languages: { name: string; count: number }[];
  topRepos: RepoDTO[];
}

const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00ADD8",
  Python: "#3572A5",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Shell: "#89e051",
  Dockerfile: "#384d54",
};
const colorOf = (l: string | null) => (l && LANG_COLOR[l]) || "#858585";

function ago(iso: string) {
  const d = (Date.now() - +new Date(iso)) / 86400000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function GitHubPanel() {
  const [data, setData] = useState<GitHubDTO | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/github")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error)
    return (
      <div className="mt-4 flex items-center gap-2 rounded border border-vsc-line bg-[#252526] px-3 py-2 text-[13px] text-[#f48771]">
        <AlertCircle size={15} /> GitHub API: {error} (лимит запросов? попробуй позже)
      </div>
    );

  if (!data)
    return (
      <div className="mt-4 flex items-center gap-2 text-[13px] text-vsc-muted">
        <Loader2 size={15} className="animate-spin" /> Тянем живые данные из GitHub API…
      </div>
    );

  const maxLang = Math.max(...data.languages.map((l) => l.count), 1);

  return (
    <div className="mt-2 space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<FolderGit2 size={14} />} label="repos" value={data.profile.publicRepos} />
        <Stat icon={<Star size={14} />} label="stars" value={data.totalStars} />
        <Stat icon={<Users size={14} />} label="followers" value={data.profile.followers} />
        <Stat icon={<GitFork size={14} />} label="following" value={data.profile.following} />
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-vsc-light-blue">
          Языки (по репозиториям)
        </h3>
        <div className="space-y-1.5">
          {data.languages.map((l) => (
            <div key={l.name} className="flex items-center gap-2 text-[12px]">
              <span className="w-24 shrink-0 text-vsc-text">{l.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#2d2d2d]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(l.count / maxLang) * 100}%`, background: colorOf(l.name) }}
                />
              </div>
              <span className="w-6 text-right text-vsc-muted">{l.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-vsc-light-blue">
          Топ репозиториев <span className="text-vsc-muted">(live)</span>
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.topRepos.map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col rounded border border-vsc-line bg-[#252526] p-3 transition-colors hover:border-vsc-accent"
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-medium text-vsc-light-blue group-hover:text-vsc-bright">
                  {r.name}
                </span>
                <ExternalLink size={13} className="shrink-0 text-vsc-muted" />
              </div>
              <p className="mt-1 line-clamp-2 min-h-[32px] text-[12px] text-vsc-muted">
                {r.description ?? "—"}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-vsc-muted">
                {r.language && (
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(r.language) }} />
                    {r.language}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star size={12} /> {r.stars}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork size={12} /> {r.forks}
                </span>
                <span className="ml-auto">{ago(r.updated)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded border border-vsc-line bg-[#252526] py-2.5">
      <div className="flex items-center gap-1 text-vsc-green">
        {icon}
        <span className="text-lg font-semibold">{value}</span>
      </div>
      <span className="mt-0.5 text-[11px] uppercase tracking-wide text-vsc-muted">{label}</span>
    </div>
  );
}
