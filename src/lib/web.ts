/**
 * Web reading/search for the assistant — server-side only.
 *
 * Uses Jina AI's free Reader (r.jina.ai) and Search (s.jina.ai) endpoints: they
 * return clean, LLM-friendly text without an API key. An optional JINA_API_KEY
 * raises rate limits. No key of ours is ever exposed to the client.
 */

const MAX_CHARS = 6000;

function jinaHeaders(): Record<string, string> {
  const key = process.env.JINA_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

/** Fetch a URL and return its main content as readable text/markdown. */
export async function webFetch(url: string): Promise<string> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return `Некорректный URL: «${url}».`;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return "Поддерживаются только http/https ссылки.";
  }
  const res = await fetch(`https://r.jina.ai/${target.toString()}`, {
    headers: { ...jinaHeaders(), "X-Return-Format": "markdown" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`не удалось прочитать страницу (HTTP ${res.status})`);
  const text = await res.text();
  return text.slice(0, MAX_CHARS) || "(пустая страница)";
}

/** Search the web; returns a compact list of results (title, URL, snippet). */
export async function webSearch(query: string): Promise<string> {
  const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
    headers: { ...jinaHeaders(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`поиск не удался (HTTP ${res.status})`);
  const json = (await res.json().catch(() => null)) as
    | { data?: { title?: string; url?: string; description?: string }[] }
    | null;
  const hits = json?.data ?? [];
  if (!hits.length) return `По запросу «${query}» ничего не найдено.`;
  return hits
    .slice(0, 8)
    .map((h) => `- ${h.title || "(без названия)"}\n  ${h.url || ""}\n  ${(h.description || "").replace(/\s+/g, " ").slice(0, 200)}`)
    .join("\n");
}
