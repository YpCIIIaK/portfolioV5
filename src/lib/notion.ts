/**
 * Notion integration — OAuth (public integration) + a tiny REST client.
 *
 * Single-owner app: the owner connects their Notion workspace once via OAuth;
 * we persist the (non-expiring) access token in Supabase (`ws_integrations`,
 * provider='notion') with the service-role key, so it never touches the client.
 * Everything here is server-side only.
 */

import { supabaseConfigured, sbSelect, sbInsert, sbDelete } from "@/lib/supabase";
import type { Priority } from "@/lib/workspace";

const API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const CLIENT_ID = process.env.NOTION_CLIENT_ID;
const CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;

/** OAuth app credentials present — the "Connect Notion" button can be shown. */
export function notionOAuthConfigured(): boolean {
  return !!CLIENT_ID && !!CLIENT_SECRET && supabaseConfigured();
}

/* ---- token storage (ws_integrations) ---------------------------------- */

export interface NotionConfig {
  /** Database id backing the unified "tasks" list, if the owner picked one. */
  tasksDbId?: string;
  /** Optional overrides for task-property auto-detection. */
  donePropName?: string;
  duePropName?: string;
  priorityPropName?: string;
}

interface IntegrationRow {
  access_token: string;
  workspace_id: string | null;
  workspace_name: string | null;
  workspace_icon: string | null;
  bot_id: string | null;
  config: NotionConfig | null;
}

let tokenCache: { at: number; row: IntegrationRow | null } | null = null;
const TOKEN_TTL = 60 * 1000;

async function getIntegration(force = false): Promise<IntegrationRow | null> {
  if (!supabaseConfigured()) return null;
  if (!force && tokenCache && Date.now() - tokenCache.at < TOKEN_TTL) return tokenCache.row;
  const rows = await sbSelect<IntegrationRow>(
    "ws_integrations",
    "select=access_token,workspace_id,workspace_name,workspace_icon,bot_id,config&provider=eq.notion&limit=1",
  );
  const row = rows[0] ?? null;
  tokenCache = { at: Date.now(), row };
  return row;
}

/** Owner has completed OAuth and we hold a usable token. */
export async function notionConnected(): Promise<boolean> {
  return !!(await getIntegration());
}

export interface NotionStatus {
  oauthConfigured: boolean;
  connected: boolean;
  workspaceName: string | null;
  workspaceIcon: string | null;
  config: NotionConfig;
}

export async function notionStatus(): Promise<NotionStatus> {
  const row = await getIntegration();
  return {
    oauthConfigured: notionOAuthConfigured(),
    connected: !!row,
    workspaceName: row?.workspace_name ?? null,
    workspaceIcon: row?.workspace_icon ?? null,
    config: row?.config ?? {},
  };
}

/** Store (upsert) the token + workspace metadata after the OAuth exchange. */
export async function saveIntegration(data: {
  access_token: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string;
  bot_id?: string;
}): Promise<void> {
  // Keep a single row per provider: delete then insert (portable upsert).
  await sbDelete("ws_integrations", "provider=eq.notion");
  await sbInsert("ws_integrations", {
    provider: "notion",
    access_token: data.access_token,
    workspace_id: data.workspace_id ?? null,
    workspace_name: data.workspace_name ?? null,
    workspace_icon: data.workspace_icon ?? null,
    bot_id: data.bot_id ?? null,
    config: {},
  });
  tokenCache = null;
}

export async function disconnectNotion(): Promise<void> {
  await sbDelete("ws_integrations", "provider=eq.notion");
  tokenCache = null;
}

export async function updateNotionConfig(patch: NotionConfig): Promise<NotionConfig> {
  const row = await getIntegration(true);
  if (!row) throw new Error("Notion не подключён");
  const config = { ...(row.config ?? {}), ...patch };
  // Drop empty-string overrides so auto-detection kicks back in.
  for (const k of Object.keys(config) as (keyof NotionConfig)[]) {
    if (config[k] === "" || config[k] == null) delete config[k];
  }
  const { sbUpdate } = await import("@/lib/supabase");
  await sbUpdate("ws_integrations", "provider=eq.notion", { config, updated_at: new Date().toISOString() });
  tokenCache = null;
  return config;
}

/* ---- OAuth ------------------------------------------------------------- */

export function notionAuthorizeUrl(redirectUri: string, state: string): string {
  const u = new URL(`${API}/oauth/authorize`);
  u.searchParams.set("client_id", CLIENT_ID!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("owner", "user");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string;
  bot_id?: string;
}

/** Exchange the OAuth `code` for a workspace access token. */
export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `Notion OAuth HTTP ${res.status}`);
  }
  return json;
}

/* ---- authenticated API calls ------------------------------------------ */

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const row = await getIntegration();
  if (!row) throw new Error("Notion не подключён");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${row.access_token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string; code?: string };
  if (!res.ok) throw new Error((json as { message?: string }).message || `Notion HTTP ${res.status}`);
  return json as T;
}

/* ---- rich text / block helpers ---------------------------------------- */

interface RichText { plain_text?: string }

function rtToText(rt?: RichText[] | null): string {
  return (rt ?? []).map((r) => r.plain_text ?? "").join("");
}

interface NotionPageObject {
  id: string;
  url?: string;
  object: string;
  properties?: Record<string, NotionProperty>;
  last_edited_time?: string;
  icon?: { emoji?: string } | null;
  parent?: { type?: string; database_id?: string; page_id?: string };
}

interface NotionProperty {
  type: string;
  title?: RichText[];
  rich_text?: RichText[];
  checkbox?: boolean;
  date?: { start?: string } | null;
  select?: { name?: string } | null;
  status?: { name?: string } | null;
  multi_select?: { name?: string }[];
}

/** Best-effort human title of a page (finds the `title`-typed property). */
export function pageTitle(page: NotionPageObject): string {
  const props = page.properties ?? {};
  for (const key of Object.keys(props)) {
    if (props[key].type === "title") {
      const t = rtToText(props[key].title);
      if (t) return t;
    }
  }
  return "Без названия";
}

/* ---- search ----------------------------------------------------------- */

export interface NotionSearchItem {
  id: string;
  title: string;
  url: string | null;
  type: "page" | "database";
  icon: string | null;
  editedAt: string | null;
}

export async function searchNotion(query: string, limit = 20): Promise<NotionSearchItem[]> {
  const body: Record<string, unknown> = {
    page_size: Math.min(limit, 50),
    sort: { direction: "descending", timestamp: "last_edited_time" },
  };
  if (query.trim()) body.query = query.trim();
  const data = await call<{ results: (NotionPageObject & { title?: RichText[] })[] }>("/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (data.results ?? []).map((r) => ({
    id: r.id,
    title: r.object === "database" ? rtToText(r.title) || "Без названия" : pageTitle(r),
    url: r.url ?? null,
    type: r.object === "database" ? "database" : "page",
    icon: r.icon?.emoji ?? null,
    editedAt: r.last_edited_time ?? null,
  }));
}

/* ---- page content ----------------------------------------------------- */

interface BlockObject {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
}

/** Render a page's top-level blocks to lightweight markdown-ish plain text. */
export async function pageContent(pageId: string, maxBlocks = 120): Promise<{ title: string; url: string | null; markdown: string }> {
  const page = await call<NotionPageObject>(`/pages/${pageId}`);
  const data = await call<{ results: BlockObject[] }>(`/blocks/${pageId}/children?page_size=${Math.min(maxBlocks, 100)}`);
  const lines: string[] = [];
  for (const b of data.results ?? []) {
    lines.push(blockToText(b));
  }
  return {
    title: pageTitle(page),
    url: page.url ?? null,
    markdown: lines.filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

function blockToText(b: BlockObject): string {
  const val = (b as Record<string, { rich_text?: RichText[]; checked?: boolean }>)[b.type];
  const text = rtToText(val?.rich_text);
  switch (b.type) {
    case "heading_1": return `# ${text}`;
    case "heading_2": return `## ${text}`;
    case "heading_3": return `### ${text}`;
    case "bulleted_list_item": return `- ${text}`;
    case "numbered_list_item": return `1. ${text}`;
    case "to_do": return `- [${val?.checked ? "x" : " "}] ${text}`;
    case "quote": return `> ${text}`;
    case "code": return "```\n" + text + "\n```";
    case "divider": return "---";
    case "paragraph": return text;
    default: return text;
  }
}

/* ---- databases -------------------------------------------------------- */

export interface NotionDatabase {
  id: string;
  title: string;
  url: string | null;
}

export async function listDatabases(): Promise<NotionDatabase[]> {
  const data = await call<{ results: (NotionPageObject & { title?: RichText[] })[] }>("/search", {
    method: "POST",
    body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 50 }),
  });
  return (data.results ?? []).map((d) => ({
    id: d.id,
    title: rtToText(d.title) || "Без названия",
    url: d.url ?? null,
  }));
}

/* ---- tasks from a database -------------------------------------------- */

export interface NotionTask {
  id: string;
  title: string;
  done: boolean;
  due: string | null;
  priority: Priority;
  url: string | null;
  createdAt: string | null;
}

const PRIORITY_MAP: Record<string, Priority> = {
  high: "high", urgent: "high", высокий: "high", срочно: "high",
  medium: "medium", normal: "medium", средний: "medium",
  low: "low", низкий: "low",
};

function mapPriority(name: string | null | undefined): Priority {
  if (!name) return "none";
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(PRIORITY_MAP)) if (key.includes(k)) return v;
  return "none";
}

interface DbSchema { properties: Record<string, { type: string }> }

/** Detect which properties hold done/due/priority (config overrides win). */
async function resolveTaskProps(dbId: string, config: NotionConfig) {
  const schema = await call<DbSchema>(`/databases/${dbId}`);
  const props = schema.properties ?? {};
  const byType = (type: string) => Object.keys(props).find((k) => props[k].type === type);
  const byName = (name: string | undefined) => (name && props[name] ? name : undefined);

  const doneProp = byName(config.donePropName) ?? byType("checkbox") ?? byType("status");
  const dueProp = byName(config.duePropName) ?? byType("date");
  const priorityProp = byName(config.priorityPropName)
    ?? Object.keys(props).find((k) => (props[k].type === "select") && /priority|приоритет/i.test(k));

  return {
    doneProp,
    doneType: doneProp ? props[doneProp].type : null,
    dueProp,
    priorityProp,
  };
}

const DONE_STATUS_WORDS = /done|complete|готово|заверш|выполнен/i;

export async function fetchNotionTasks(config: NotionConfig, limit = 50): Promise<NotionTask[]> {
  if (!config.tasksDbId) return [];
  const meta = await resolveTaskProps(config.tasksDbId, config);
  const data = await call<{ results: NotionPageObject[] }>(`/databases/${config.tasksDbId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: Math.min(limit, 100) }),
  });

  return (data.results ?? []).map((row) => {
    const props = row.properties ?? {};
    let done = false;
    if (meta.doneProp && props[meta.doneProp]) {
      const p = props[meta.doneProp];
      done = meta.doneType === "checkbox" ? !!p.checkbox : DONE_STATUS_WORDS.test(p.status?.name ?? "");
    }
    const due = meta.dueProp ? props[meta.dueProp]?.date?.start ?? null : null;
    const priority = meta.priorityProp ? mapPriority(props[meta.priorityProp]?.select?.name) : "none";
    return {
      id: row.id,
      title: pageTitle(row),
      done,
      due: due ? due.slice(0, 10) : null,
      priority,
      url: row.url ?? null,
      createdAt: row.last_edited_time ?? null,
    };
  });
}

/* ---- create page ------------------------------------------------------ */

/** Create a page under a parent page (or as a database row). `markdown`
 *  is split into paragraph blocks (best-effort, no nested formatting). */
export async function createPage(opts: {
  parentPageId?: string;
  parentDbId?: string;
  title: string;
  markdown?: string;
}): Promise<{ id: string; url: string | null }> {
  const parent = opts.parentDbId
    ? { database_id: opts.parentDbId }
    : opts.parentPageId
      ? { page_id: opts.parentPageId }
      : null;
  if (!parent) throw new Error("Не указан родитель (страница или база)");

  // For a DB row, the title must go under the DB's title property. We don't
  // know its name up front, so detect it; for a page parent use `title`.
  let titleProp = "title";
  if (opts.parentDbId) {
    const schema = await call<DbSchema>(`/databases/${opts.parentDbId}`);
    titleProp = Object.keys(schema.properties ?? {}).find((k) => schema.properties[k].type === "title") ?? "Name";
  }

  const properties = opts.parentDbId
    ? { [titleProp]: { title: [{ text: { content: opts.title.slice(0, 2000) } }] } }
    : { title: { title: [{ text: { content: opts.title.slice(0, 2000) } }] } };

  const children = (opts.markdown ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 90)
    .map((p) => ({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: p.slice(0, 2000) } }] },
    }));

  const created = await call<{ id: string; url?: string }>("/pages", {
    method: "POST",
    body: JSON.stringify({ parent, properties, ...(children.length ? { children } : {}) }),
  });
  return { id: created.id, url: created.url ?? null };
}

/* ---- assistant context ------------------------------------------------ */

/** Compact plain-text snapshot for the AI aggregator (titles only). */
export async function notionContext(): Promise<string> {
  const status = await notionStatus();
  if (!status.connected) return "";
  const parts: string[] = [];
  try {
    const recent = await searchNotion("", 12);
    if (recent.length) {
      parts.push("NOTION (недавние страницы):\n" + recent.map((r) => `- ${r.title}${r.type === "database" ? " [база]" : ""}`).join("\n"));
    }
  } catch { /* skip */ }
  if (status.config.tasksDbId) {
    try {
      const tasks = (await fetchNotionTasks(status.config, 20)).filter((t) => !t.done);
      if (tasks.length) {
        parts.push("NOTION ЗАДАЧИ (открытые):\n" + tasks.map((t) => `- ${t.title}${t.due ? ` (до ${t.due})` : ""}${t.priority !== "none" ? ` [${t.priority}]` : ""}`).join("\n"));
      }
    } catch { /* skip */ }
  }
  return parts.join("\n\n");
}
