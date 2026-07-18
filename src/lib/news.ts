/**
 * Compact tech / AI headlines + trending GitHub repos for the workspace news tab
 * and the owner assistant context. Cached server-side (~5 min).
 */

const GH = "https://api.github.com";
const TTL = 5 * 60 * 1000;

export interface NewsRepo {
  title: string;
  url: string;
  stars: number;
  language: string | null;
  description: string | null;
}

export interface NewsHeadline {
  id: string;
  title: string;
  url: string;
  source: string;
  time: string | null;
  description: string | null;
}

export interface NewsSnapshot {
  repos: NewsRepo[];
  tech: NewsHeadline[];
  ai: NewsHeadline[];
  fetchedAt: string;
}

let cache: { at: number; data: NewsSnapshot } | null = null;

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-vscode",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function decodeHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function stripHtml(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseRss(xml: string, source: string, limit: number): NewsHeadline[] {
  const out: NewsHeadline[] = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && out.length < limit) {
    const block = m[1];
    const title = decodeHtml(
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "",
    );
    const link =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ??
      block.match(/<link[^>]+href="([^"]+)"/i)?.[1] ??
      "";
    const time =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ??
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() ??
      null;
    const rawDesc =
      block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] ??
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
      "";
    const description = rawDesc ? stripHtml(rawDesc).slice(0, 600) || null : null;
    if (title && link) {
      out.push({
        id: `rss:${source}:${link}`,
        title,
        url: link,
        source,
        time,
        description,
      });
    }
  }
  return out;
}

async function fetchRss(url: string, source: string, limit: number): Promise<NewsHeadline[]> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  return parseRss(await res.text(), source, limit);
}

async function fetchTrendingRepos(limit: number): Promise<NewsRepo[]> {
  const week = daysAgo(7);
  // Qualifiers are space-separated; encodeURIComponent turns the space into
  // %20 (which GitHub accepts). A literal "+" would be encoded to %2B and break
  // the query (422), silently emptying the trending section.
  const q = encodeURIComponent(`stars:>200 pushed:>${week}`);
  const res = await fetch(
    `${GH}/search/repositories?q=${q}&sort=stars&order=desc&per_page=${limit}`,
    { headers: ghHeaders(), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const json = (await res.json()) as {
    items: {
      full_name: string;
      html_url: string;
      stargazers_count: number;
      language: string | null;
      description: string | null;
    }[];
  };
  return json.items.map((r) => ({
    title: r.full_name,
    url: r.html_url,
    stars: r.stargazers_count,
    language: r.language,
    description: r.description,
  }));
}

export type NewsSelection =
  | { kind: "repo"; item: NewsRepo }
  | { kind: "headline"; item: NewsHeadline };

export function newsItemId(item: NewsSelection): string {
  return item.kind === "repo" ? `repo:${item.item.url}` : item.item.id;
}

async function fetchHackerNews(limit: number): Promise<NewsHeadline[]> {
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${limit}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`HN ${res.status}`);
  const json = (await res.json()) as {
    hits: { title: string; url: string | null; objectID: string; created_at: string; points: number; num_comments: number }[];
  };

  const details = await Promise.allSettled(
    json.hits.map((h) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${h.objectID}.json`, { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<{ text?: string; url?: string }>) : null,
      ),
    ),
  );

  return json.hits.map((h, i) => {
    const item = details[i].status === "fulfilled" ? details[i].value : null;
    const text = item?.text ? stripHtml(item.text).slice(0, 600) : null;
    const meta = `${h.points} pts · ${h.num_comments} комм.`;
    return {
      id: `hn:${h.objectID}`,
      title: h.title,
      url: h.url || item?.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: "HN",
      time: h.created_at,
      description: text || meta,
    };
  });
}

async function fetchAiNews(limit: number): Promise<NewsHeadline[]> {
  const feeds = await Promise.allSettled([
    fetchRss("https://techcrunch.com/category/artificial-intelligence/feed/", "TechCrunch", 6),
    fetchRss("https://the-decoder.com/feed/", "The Decoder", 6),
    fetchRss("https://www.artificialintelligence-news.com/feed/", "AI News", 6),
  ]);
  const merged = feeds.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  merged.sort((a, b) => +new Date(b.time ?? 0) - +new Date(a.time ?? 0));
  const seen = new Set<string>();
  const unique: NewsHeadline[] = [];
  for (const item of merged) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}

async function build(): Promise<NewsSnapshot> {
  const [reposR, techR, aiR] = await Promise.allSettled([
    fetchTrendingRepos(12),
    fetchHackerNews(12),
    fetchAiNews(12),
  ]);

  return {
    repos: reposR.status === "fulfilled" ? reposR.value : [],
    tech: techR.status === "fulfilled" ? techR.value : [],
    ai: aiR.status === "fulfilled" ? aiR.value : [],
    fetchedAt: new Date().toISOString(),
  };
}

/** Cached news snapshot for API + assistant context. */
export async function fetchNews(force = false): Promise<NewsSnapshot> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.data;
  const data = await build();
  cache = { at: Date.now(), data };
  return data;
}

/** Plain-text block for the AI assistant (compact). */
export function formatNewsContext(s: NewsSnapshot): string {
  const parts: string[] = [];
  if (s.repos.length) {
    parts.push(
      "GITHUB ТРЕНДЫ:\n" +
        s.repos
          .slice(0, 8)
          .map((r) => `- ${r.title} (★${r.stars}${r.language ? `, ${r.language}` : ""})`)
          .join("\n"),
    );
  }
  if (s.tech.length) {
    parts.push(
      "ТЕХ-НОВОСТИ:\n" +
        s.tech
          .slice(0, 8)
          .map((h) => `- [${h.source}] ${h.title}${h.description ? `: ${h.description.slice(0, 120)}` : ""}`)
          .join("\n"),
    );
  }
  if (s.ai.length) {
    parts.push(
      "AI-НОВОСТИ:\n" +
        s.ai
          .slice(0, 8)
          .map((h) => `- [${h.source}] ${h.title}${h.description ? `: ${h.description.slice(0, 120)}` : ""}`)
          .join("\n"),
    );
  }
  return parts.join("\n\n");
}
