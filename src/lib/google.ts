/**
 * Google Drive integration — OAuth + a thin Drive v3 REST client.
 *
 * Drive stays the storage: we never copy file bodies into Supabase. What we do
 * keep is an *index* (`ws_drive_index`) — id, name, mime, modifiedTime, md5 —
 * because without it there's no way to tell what changed, plus a short text
 * excerpt so the assistant/brain has something to read without re-downloading
 * every file on every prompt.
 *
 * Incremental sync uses Drive's changes feed: we store a `startPageToken` per
 * source and only pull the delta. Server-side only (service-role Supabase).
 */

import { supabaseConfigured, sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/supabase";
import { isDocumentMime, documentToText } from "@/lib/office";

const OAUTH = "https://oauth2.googleapis.com";
const API = "https://www.googleapis.com/drive/v3";
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/** Read-only across the whole Drive — needed to walk a folder the owner picks. */
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

export const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Ceiling per attached folder. Metadata for this many files is cheap (~15 API
 *  calls per 3k); the text excerpts are what cost time, so they're backfilled
 *  across runs rather than downloaded in one go. */
export const MAX_FILES_PER_SOURCE = 3000;

/** How long one sync run may spend fetching excerpts before it stops and leaves
 *  the rest for the next run. Comfortably under the route's maxDuration=300. */
const TEXT_BUDGET_MS = 200_000;

/** Parallel excerpt downloads. Drive tolerates this easily and it turns a
 *  multi-hour serial crawl into something that finishes. */
const TEXT_CONCURRENCY = 8;

export function googleConfigured(): boolean {
  return !!CLIENT_ID && !!CLIENT_SECRET && supabaseConfigured();
}

/* ---- token storage (ws_integrations, provider='google') ----------------- */

interface GoogleRow {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  workspace_name: string | null; // the Google account email
  workspace_icon: string | null; // avatar
  config: Record<string, unknown> | null;
}

let cache: { at: number; row: GoogleRow | null } | null = null;
const CACHE_TTL = 30 * 1000;

async function getRow(force = false): Promise<GoogleRow | null> {
  if (!supabaseConfigured()) return null;
  if (!force && cache && Date.now() - cache.at < CACHE_TTL) return cache.row;
  const rows = await sbSelect<GoogleRow>(
    "ws_integrations",
    "select=access_token,refresh_token,expires_at,workspace_name,workspace_icon,config&provider=eq.google&limit=1",
  );
  const row = rows[0] ?? null;
  cache = { at: Date.now(), row };
  return row;
}

export interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  account: string | null;
  avatar: string | null;
}

export async function googleStatus(): Promise<GoogleStatus> {
  const row = await getRow();
  return {
    configured: googleConfigured(),
    connected: !!row,
    account: row?.workspace_name ?? null,
    avatar: row?.workspace_icon ?? null,
  };
}

/** We hold usable tokens (mirrors notionConnected). */
export async function googleConnected(): Promise<boolean> {
  return !!(await getRow());
}

export async function disconnectGoogle(): Promise<void> {
  await sbDelete("ws_integrations", "provider=eq.google");
  await sbDelete("ws_drive_sources", "id=not.is.null");
  await sbDelete("ws_drive_index", "id=not.is.null");
  cache = null;
}

/* ---- OAuth -------------------------------------------------------------- */

export function googleAuthorizeUrl(redirectUri: string, state: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", [...SCOPES, "openid", "email", "profile"].join(" "));
  u.searchParams.set("state", state);
  // Without BOTH of these Google withholds the refresh token and the whole
  // integration dies after the first hour.
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, ...body }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `Google OAuth HTTP ${res.status}`);
  }
  return json;
}

/** Exchange the callback `code`, fetch the account identity, and persist. */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<void> {
  const token = await tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (!token.refresh_token) {
    throw new Error("Google не вернул refresh_token — отзови доступ в myaccount.google.com/permissions и подключись заново");
  }

  const me = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  // Single row per provider: delete then insert (portable upsert), same as Notion.
  await sbDelete("ws_integrations", "provider=eq.google");
  await sbInsert("ws_integrations", {
    provider: "google",
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    workspace_name: me?.email ?? null,
    workspace_icon: me?.picture ?? null,
    config: {},
  });
  cache = null;
}

/** A valid access token, refreshed in place when it's within a minute of expiry. */
async function getAccessToken(): Promise<string> {
  const row = await getRow();
  if (!row) throw new Error("Google Drive не подключён");

  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : 0;
  if (expiresAt - Date.now() > 60_000) return row.access_token;
  if (!row.refresh_token) throw new Error("Нет refresh_token — переподключи Google Drive");

  const token = await tokenRequest({ refresh_token: row.refresh_token, grant_type: "refresh_token" });
  await sbUpdate("ws_integrations", "provider=eq.google", {
    access_token: token.access_token,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  cache = null;
  return token.access_token;
}

/* ---- Drive API calls ---------------------------------------------------- */

async function drive<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Drive HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  md5Checksum?: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
  trashed?: boolean;
}

const FILE_FIELDS = "id,name,mimeType,modifiedTime,md5Checksum,size,parents,webViewLink,trashed";

/**
 * One level of the tree: folders first, then files, so the owner can attach
 * either. Without `parent` this is the account's root — Drive's alias 'root'
 * keeps the top level to actual top-level items instead of every folder in the
 * account (which would list nested ones like `.obsidian` alongside their parents).
 */
export async function listChildren(parent?: string): Promise<DriveFile[]> {
  const id = (parent || "root").replace(/'/g, "\\'");
  const q = encodeURIComponent(`'${id}' in parents and trashed=false`);
  const data = await drive<{ files: DriveFile[] }>(
    `/files?q=${q}&fields=files(${FILE_FIELDS})&pageSize=500&orderBy=folder,name` +
      `&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  return data.files ?? [];
}

/** Metadata for a single file — used when the owner attaches one directly. */
export async function getFile(fileId: string): Promise<DriveFile> {
  return drive<DriveFile>(
    `/files/${encodeURIComponent(fileId)}?fields=${FILE_FIELDS}&supportsAllDrives=true`,
  );
}

/** Every non-folder file under `folderId`. With `recursive` it walks subfolders
 *  breadth-first — Drive's `in parents` only matches direct children, so the
 *  recursion is on us; without it only the folder's own files are indexed. */
export async function listFilesRecursive(
  folderId: string,
  maxFiles = MAX_FILES_PER_SOURCE,
  recursive = true,
): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  const queue = [folderId];
  const seen = new Set<string>();

  while (queue.length && out.length < maxFiles) {
    const current = queue.shift()!;
    if (seen.has(current)) continue; // shortcuts can make the tree a cycle
    seen.add(current);

    let pageToken: string | undefined;
    do {
      const q = encodeURIComponent(`'${current.replace(/'/g, "\\'")}' in parents and trashed=false`);
      const data: { files: DriveFile[]; nextPageToken?: string } = await drive(
        `/files?q=${q}&fields=nextPageToken,files(${FILE_FIELDS})&pageSize=200` +
          `&supportsAllDrives=true&includeItemsFromAllDrives=true` +
          (pageToken ? `&pageToken=${pageToken}` : ""),
      );
      for (const f of data.files ?? []) {
        if (f.mimeType === FOLDER_MIME) { if (recursive) queue.push(f.id); }
        else if (out.length < maxFiles) out.push(f);
      }
      pageToken = data.nextPageToken;
    } while (pageToken && out.length < maxFiles);
  }
  return out;
}

/** Token marking "now" in the changes feed — stored so the next sync is a delta. */
export async function getStartPageToken(): Promise<string> {
  const data = await drive<{ startPageToken: string }>(
    "/changes/startPageToken?supportsAllDrives=true",
  );
  return data.startPageToken;
}

export interface DriveChange {
  fileId: string;
  removed?: boolean;
  file?: DriveFile;
}

/** Drain the changes feed from `pageToken`; returns changes + the next token. */
export async function listChanges(pageToken: string): Promise<{ changes: DriveChange[]; nextToken: string }> {
  const changes: DriveChange[] = [];
  let token: string | undefined = pageToken;
  let newStartPageToken = pageToken;

  while (token) {
    const data: {
      changes: DriveChange[];
      nextPageToken?: string;
      newStartPageToken?: string;
    } = await drive(
      `/changes?pageToken=${token}&fields=nextPageToken,newStartPageToken,changes(fileId,removed,file(${FILE_FIELDS}))` +
        `&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    );
    changes.push(...(data.changes ?? []));
    if (data.newStartPageToken) newStartPageToken = data.newStartPageToken;
    token = data.nextPageToken;
  }
  return { changes, nextToken: newStartPageToken };
}

/* ---- reading file text -------------------------------------------------- */

/** Google-native types have no binary body — they must be exported instead. */
const EXPORT_AS: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.presentation": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
};

const READABLE = /^(text\/|application\/(json|xml|javascript|x-yaml))/;

export function isReadable(mimeType: string): boolean {
  return mimeType in EXPORT_AS || READABLE.test(mimeType) || isDocumentMime(mimeType);
}

/** Plain text of a file, capped. Returns "" for binaries we can't read. */
export async function fileText(file: DriveFile, maxChars = 20_000): Promise<string> {
  if (!isReadable(file.mimeType)) return "";
  const token = await getAccessToken();
  const exportMime = EXPORT_AS[file.mimeType];
  const url = exportMime
    ? `${API}/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`
    : `${API}/files/${file.id}?alt=media&supportsAllDrives=true`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return "";

  // docx/xlsx/pdf приходят бинарём — их текст достаём распаковкой/парсером,
  // читать их как строку бессмысленно.
  if (isDocumentMime(file.mimeType)) {
    const buf = Buffer.from(await res.arrayBuffer());
    return sanitize(await documentToText(file.mimeType, buf)).slice(0, maxChars);
  }
  return sanitize(await res.text()).slice(0, maxChars);
}

/**
 * Make Drive's bytes safe to store as Postgres `text`.
 *
 * Postgres rejects NUL outright (22P05), so a UTF-16 file — every other byte a
 * NUL — or a mislabelled binary would fail the whole insert. We also drop the
 * BOM and the other C0 controls, keeping tab/newline/CR.
 */
function sanitize(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

/* ---- sources & index (Supabase) ----------------------------------------- */

export interface DriveSource {
  id: string;
  /** Drive id of the attached item — a folder, or a single file when kind='file'. */
  folder_id: string;
  name: string;
  /** 'folder' walks the tree; 'file' indexes exactly one file. */
  kind: string;
  recursive: boolean;
  page_token: string | null;
  status: string; // ok | revoked
  last_sync_at: string | null;
  file_count: number;
}

export async function listSources(): Promise<DriveSource[]> {
  if (!supabaseConfigured()) return [];
  return sbSelect<DriveSource>("ws_drive_sources", "select=*&order=created_at.asc");
}

export async function addSource(
  folderId: string,
  name: string,
  recursive = true,
  kind: "folder" | "file" = "folder",
): Promise<DriveSource> {
  const existing = await sbSelect<DriveSource>(
    "ws_drive_sources",
    `select=id&folder_id=eq.${encodeURIComponent(folderId)}&limit=1`,
  );
  if (existing.length) throw new Error(kind === "file" ? "Этот файл уже подключён" : "Эта папка уже подключена");
  return sbInsert<DriveSource>("ws_drive_sources", { folder_id: folderId, name, recursive, kind });
}

export async function removeSource(id: string): Promise<void> {
  await sbDelete("ws_drive_index", `source_id=eq.${id}`);
  await sbDelete("ws_drive_sources", `id=eq.${id}`);
}

export interface DriveIndexRow {
  id: string;
  source_id: string;
  file_id: string;
  name: string;
  mime_type: string;
  modified_time: string | null;
  md5: string | null;
  web_view_link: string | null;
  excerpt: string;
}

/**
 * Raised when the source row vanished mid-run — the owner detached the folder
 * (or reconnected Drive) while a long sync was still writing. Postgres answers
 * every insert with a foreign-key violation (23503) at that point, so we bail
 * out instead of grinding through thousands of doomed writes.
 */
class SourceGoneError extends Error {
  constructor() {
    super("Источник удалён во время синхронизации");
  }
}

function isMissingSource(e: unknown): boolean {
  return /23503|source_id_fkey/.test((e as Error)?.message ?? "");
}

export interface SyncStats {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  /** Excerpts fetched this run. */
  texts: number;
  /** Files still waiting for their text — pick them up on the next run. */
  pending: number;
}

/**
 * Sync one source, in two phases.
 *
 * Phase 1 (metadata) is cheap — one Drive call per 200 files — so the index
 * always ends up complete: every file is listed and searchable by name after a
 * single run, even for a 3k-file folder.
 *
 * Phase 2 (excerpts) is the expensive half: one HTTP download per file. It runs
 * under a wall-clock budget and marks whatever it didn't reach as `needs_text`,
 * so the next run continues where this one stopped. That's what keeps a big
 * folder from timing out forever without ever committing progress.
 *
 * First run walks the folder; later runs replay the changes feed.
 */
export async function syncSource(source: DriveSource): Promise<SyncStats> {
  const startedAt = Date.now();
  const stats: SyncStats = { added: 0, updated: 0, removed: 0, skipped: 0, texts: 0, pending: 0 };

  const indexed = await sbSelect<DriveIndexRow>(
    "ws_drive_index",
    `select=id,file_id,md5,modified_time&source_id=eq.${source.id}`,
  );
  const byFileId = new Map(indexed.map((r) => [r.file_id, r]));

  let files: DriveFile[];
  let nextToken: string;

  if (!source.page_token) {
    // Cold start: full walk, and pin a token so the next run is incremental.
    nextToken = await getStartPageToken();
    files =
      source.kind === "file"
        ? [await getFile(source.folder_id)]
        : await listFilesRecursive(source.folder_id, MAX_FILES_PER_SOURCE, source.recursive);
  } else {
    const { changes, nextToken: t } = await listChanges(source.page_token);
    nextToken = t;
    files = [];
    for (const change of changes) {
      const known = byFileId.get(change.fileId);
      if (change.removed || change.file?.trashed) {
        if (known) {
          await sbDelete("ws_drive_index", `id=eq.${known.id}`);
          stats.removed++;
        }
        continue;
      }
      if (!change.file) continue;
      // The feed covers the whole Drive, so filter it down to this source:
      // for a single file that's an id match, for a folder its direct children
      // (plus anything already indexed under it, which covers subfolders).
      const mine =
        source.kind === "file"
          ? change.fileId === source.folder_id
          : known || change.file.parents?.includes(source.folder_id);
      if (mine) files.push(change.file);
    }
  }

  // The Drive walk above can take a while; make sure the owner didn't detach
  // the source in the meantime before we start writing thousands of rows.
  const alive = await sbSelect<{ id: string }>("ws_drive_sources", `select=id&id=eq.${source.id}&limit=1`);
  if (!alive.length) throw new SourceGoneError();

  /* -- phase 1: metadata, no downloads -- */
  for (const file of files) {
    if (file.mimeType === FOLDER_MIME) continue;
    const known = byFileId.get(file.id);
    const unchanged =
      known &&
      ((file.md5Checksum && known.md5 === file.md5Checksum) ||
        (!file.md5Checksum && known.modified_time === file.modifiedTime));
    if (unchanged) continue;

    const row = {
      source_id: source.id,
      file_id: file.id,
      name: sanitize(file.name),
      mime_type: file.mimeType,
      modified_time: file.modifiedTime ?? null,
      md5: file.md5Checksum ?? null,
      size: file.size ? Number(file.size) : null,
      web_view_link: file.webViewLink ?? null,
      // Binary types never get an excerpt, so don't queue them for a download.
      needs_text: isReadable(file.mimeType),
      synced_at: new Date().toISOString(),
    };

    // One unwritable file must not abort the whole folder: skip it and keep
    // going, so a single odd encoding can't cost us the entire sync. A missing
    // source is different — every remaining write would fail the same way, so
    // stop rather than spray hundreds of FK violations at the database.
    try {
      if (known) {
        await sbUpdate("ws_drive_index", `id=eq.${known.id}`, row);
        stats.updated++;
      } else {
        await sbInsert("ws_drive_index", { ...row, excerpt: "" });
        stats.added++;
      }
    } catch (e) {
      if (isMissingSource(e)) throw new SourceGoneError();
      stats.skipped++;
    }
  }

  /* -- phase 2: excerpts, time-boxed and resumable -- */
  const queued = await sbSelect<DriveIndexRow & { needs_text: boolean }>(
    "ws_drive_index",
    `select=id,file_id,name,mime_type&source_id=eq.${source.id}&needs_text=is.true&limit=2000`,
  );

  let cursor = 0;
  const worker = async () => {
    while (cursor < queued.length && Date.now() - startedAt < TEXT_BUDGET_MS) {
      const row = queued[cursor++];
      try {
        const excerpt = await fileText(
          { id: row.file_id, name: row.name, mimeType: row.mime_type },
          4000,
        );
        await sbUpdate("ws_drive_index", `id=eq.${row.id}`, { excerpt, needs_text: false });
        stats.texts++;
      } catch {
        // Don't retry forever on a file Drive won't give us.
        await sbUpdate("ws_drive_index", `id=eq.${row.id}`, { needs_text: false }).catch(() => {});
        stats.skipped++;
      }
    }
  };
  await Promise.all(Array.from({ length: TEXT_CONCURRENCY }, worker));
  stats.pending = Math.max(0, queued.length - cursor);

  const total = await sbSelect<{ id: string }>("ws_drive_index", `select=id&source_id=eq.${source.id}`);
  await sbUpdate("ws_drive_sources", `id=eq.${source.id}`, {
    page_token: nextToken,
    last_sync_at: new Date().toISOString(),
    file_count: total.length,
    status: "ok",
  });

  return stats;
}

/** Sync every source; a dead one is marked instead of failing the whole run. */
export async function syncAll(): Promise<Record<string, unknown>[]> {
  const sources = await listSources();
  const results: Record<string, unknown>[] = [];
  for (const s of sources) {
    try {
      results.push({ source: s.name, ...(await syncSource(s)) });
    } catch (e) {
      const message = (e as Error).message;
      // Detached mid-run: nothing wrong with the integration, just skip it.
      if (e instanceof SourceGoneError) {
        results.push({ source: s.name, detached: true });
        continue;
      }
      // 404/403 usually means the folder was unshared or deleted — flag it so
      // the index doesn't silently rot.
      if (/40[34]/.test(message)) {
        await sbUpdate("ws_drive_sources", `id=eq.${s.id}`, { status: "revoked" });
      }
      results.push({ source: s.name, error: message });
    }
  }
  return results;
}

/* ---- search & assistant context ----------------------------------------- */

const INDEX_FIELDS =
  "select=id,source_id,file_id,name,mime_type,modified_time,web_view_link,excerpt";

/** Search the index. An empty query lists the freshest files — that's what the
 *  panel shows on open, so it must not come back empty. */
export async function searchDrive(query: string, limit = 20): Promise<DriveIndexRow[]> {
  if (!supabaseConfigured()) return [];
  const term = query.trim();
  if (!term) {
    return sbSelect<DriveIndexRow>(
      "ws_drive_index",
      `${INDEX_FIELDS}&order=modified_time.desc.nullslast&limit=${limit}`,
    );
  }
  const q = encodeURIComponent(`%${term}%`);
  return sbSelect<DriveIndexRow>(
    "ws_drive_index",
    `${INDEX_FIELDS}&or=(name.ilike.${q},excerpt.ilike.${q})` +
      `&order=modified_time.desc.nullslast&limit=${limit}`,
  );
}

/** Full text of an indexed file, fetched live from Drive (the index only keeps
 *  a 4k excerpt). Returns null when the id isn't ours — the assistant must not
 *  be able to read arbitrary Drive files outside the picked folders. */
export async function readDriveFile(fileId: string): Promise<{ name: string; text: string } | null> {
  const known = await sbSelect<DriveIndexRow>(
    "ws_drive_index",
    `select=file_id,name,mime_type&file_id=eq.${encodeURIComponent(fileId)}&limit=1`,
  );
  if (!known.length) return null;
  const row = known[0];
  const text = await fileText(
    { id: row.file_id, name: row.name, mimeType: row.mime_type },
    20_000,
  );
  return { name: row.name, text };
}

/**
 * Richer snapshot for the brain builder: filenames PLUS excerpt text, because
 * the graph needs to know what a document is about, not just that it exists.
 * The assistant's own context stays filenames-only (see driveContext) — it can
 * always call read_drive_file when it needs the body.
 */
export async function driveBrainContext(limit = 60, chars = 500): Promise<string> {
  if (!supabaseConfigured()) return "";
  try {
    const sources = await listSources();
    if (!sources.length) return "";
    // Файлы с текстом идут первыми: пустая выжимка даёт модели только имя,
    // а места в контексте занимает столько же.
    const files = await sbSelect<DriveIndexRow>(
      "ws_drive_index",
      `${INDEX_FIELDS}&excerpt=neq.&order=modified_time.desc.nullslast&limit=${limit}`,
    );
    // Сколько ещё ждёт скачивания текста — без этого «мозг мало берёт с диска»
    // выглядит как баг, хотя индекс просто не дособран.
    const pending = await sbSelect<{ id: string }>(
      "ws_drive_index",
      "select=id&needs_text=is.true&limit=1000",
    );

    if (!files.length) {
      return pending.length
        ? `GOOGLE DRIVE: индекс ещё собирается, текст скачан для 0 файлов (в очереди ${pending.length}). Файлы не учитывай.`
        : "";
    }

    const lines = files.map((f) => `- ${f.name}: ${f.excerpt.replace(/\s+/g, " ").slice(0, chars)}`);
    const tail = pending.length ? ` — ещё ${pending.length} файлов ждут индексации текста` : "";
    return `GOOGLE DRIVE (папки: ${sources.map((s) => s.name).join(", ")}; файлов с текстом: ${files.length}${tail}):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

/** Compact snapshot for the AI aggregator — filenames only, like notionContext. */
export async function driveContext(): Promise<string> {
  if (!supabaseConfigured()) return "";
  try {
    const sources = await listSources();
    if (!sources.length) return "";
    const recent = await sbSelect<DriveIndexRow>(
      "ws_drive_index",
      "select=name,mime_type,modified_time&order=modified_time.desc&limit=20",
    );
    if (!recent.length) return "";
    return (
      `GOOGLE DRIVE (папки: ${sources.map((s) => s.name).join(", ")}):\n` +
      recent.map((f) => `- ${f.name}`).join("\n")
    );
  } catch {
    return "";
  }
}
