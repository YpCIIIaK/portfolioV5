/**
 * Bitrix24 REST client via incoming webhook (входящий вебхук).
 * BITRIX_WEBHOOK_URL looks like: https://xxx.bitrix24.ru/rest/<userId>/<token>/
 * The webhook is bound to one user, so "my tasks / my chats / feed" are that user's.
 */

const BASE = (process.env.BITRIX_WEBHOOK_URL || "").replace(/\/+$/, "");

export function bitrixConfigured(): boolean {
  return !!BASE;
}

async function call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${BASE}/${method}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    result?: T;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || json.error) {
    throw new Error(json.error_description || json.error || `Bitrix HTTP ${res.status}`);
  }
  return json.result as T;
}

/* ---- tasks ------------------------------------------------------------ */

export interface BxTask {
  id: string;
  title: string;
  status: string; // human-readable label
  statusCode: number;
  deadline: string | null;
  createdDate: string | null;
  responsible: string | null;
  creator: string | null;
  groupName: string | null;
  url: string | null;
}

const TASK_STATUS: Record<number, string> = {
  2: "Ждёт выполнения",
  3: "Выполняется",
  4: "Ждёт контроля",
  5: "Завершена",
  6: "Отложена",
};

interface RawTask {
  id: string;
  title: string;
  status: string;
  deadline?: string | null;
  createdDate?: string | null;
  responsible?: { name?: string } | null;
  creator?: { name?: string } | null;
  group?: { name?: string } | null;
}

/**
 * `includeDone` нужен мозгу: граф знаний строится и по закрытым задачам —
 * они показывают, чем человек занимался. В панели же завершённые скрыты,
 * чтобы список задач оставался рабочим.
 */
export async function fetchTasks(limit = 50, includeDone = false): Promise<BxTask[]> {
  const result = await call<{ tasks: RawTask[] }>("tasks.task.list", {
    order: { ID: "desc" },
    filter: includeDone ? {} : { "!STATUS": 5 },
    select: ["ID", "TITLE", "STATUS", "DEADLINE", "CREATED_DATE", "RESPONSIBLE_ID", "CREATED_BY", "GROUP_ID"],
    limit,
  });
  const origin = BASE.replace(/\/rest\/.*$/, "");
  return (result.tasks || []).map((t) => ({
    id: String(t.id),
    title: t.title,
    statusCode: Number(t.status),
    status: TASK_STATUS[Number(t.status)] || `Статус ${t.status}`,
    deadline: t.deadline || null,
    createdDate: t.createdDate || null,
    responsible: t.responsible?.name || null,
    creator: t.creator?.name || null,
    groupName: t.group?.name || null,
    url: origin ? `${origin}/company/personal/user/0/tasks/task/view/${t.id}/` : null,
  }));
}

/* ---- one task (full detail) ------------------------------------------- */

export interface BxTaskFull {
  id: string;
  title: string;
  description: string;
  status: string;
  statusCode: number;
  createdDate: string | null;
  deadline: string | null;
  closedDate: string | null;
  creator: string | null; // кто поставил
  responsible: string | null; // исполнитель
  accomplices: string[]; // соисполнители
  auditors: string[]; // наблюдатели
  groupName: string | null;
  url: string | null;
}

interface RawFullTask {
  id?: string | number;
  title?: string;
  description?: string;
  status?: string | number;
  createdDate?: string;
  deadline?: string;
  closedDate?: string;
  createdBy?: string | number;
  responsibleId?: string | number;
  creator?: { id?: string | number; name?: string };
  responsible?: { id?: string | number; name?: string };
  group?: { name?: string };
  accomplices?: (string | number)[];
  auditors?: (string | number)[];
}

/** Strip light BBCode so descriptions read as plain text. */
function stripBB(s: string): string {
  return s.replace(/\[\/?[a-z][^\]]*\]/gi, "").trim();
}

export async function fetchTask(id: string): Promise<BxTaskFull> {
  const r = await call<{ task: RawFullTask }>("tasks.task.get", {
    taskId: id,
    select: ["ID", "TITLE", "DESCRIPTION", "STATUS", "CREATED_DATE", "DEADLINE", "CLOSED_DATE", "CREATED_BY", "RESPONSIBLE_ID", "GROUP_ID", "ACCOMPLICES", "AUDITORS"],
  });
  const t = r.task || {};
  const accIds = (t.accomplices || []).map(String);
  const audIds = (t.auditors || []).map(String);
  const creatorId = String(t.createdBy ?? t.creator?.id ?? "");
  const respId = String(t.responsibleId ?? t.responsible?.id ?? "");

  // Resolve every referenced user in one batch (names are only ids otherwise).
  const ids = [...new Set([creatorId, respId, ...accIds, ...audIds].filter(Boolean))];
  const names = new Map<string, string>();
  if (ids.length) {
    try {
      const users = await call<{ ID: string; NAME?: string; LAST_NAME?: string; EMAIL?: string }[]>("user.get", { FILTER: { ID: ids } });
      for (const u of users || []) names.set(String(u.ID), [u.NAME, u.LAST_NAME].filter(Boolean).join(" ") || u.EMAIL || `#${u.ID}`);
    } catch {
      // names are cosmetic — fall back to #id below
    }
  }
  const nameOf = (uid: string): string | null => (uid ? names.get(uid) || `#${uid}` : null);
  const origin = BASE.replace(/\/rest\/.*$/, "");

  return {
    id: String(t.id ?? id),
    title: t.title || "",
    description: stripBB(t.description || ""),
    statusCode: Number(t.status),
    status: TASK_STATUS[Number(t.status)] || `Статус ${t.status}`,
    createdDate: t.createdDate || null,
    deadline: t.deadline || null,
    closedDate: t.closedDate || null,
    creator: nameOf(creatorId),
    responsible: nameOf(respId),
    accomplices: accIds.map(nameOf).filter((x): x is string => !!x),
    auditors: audIds.map(nameOf).filter((x): x is string => !!x),
    groupName: t.group?.name || null,
    url: origin ? `${origin}/company/personal/user/0/tasks/task/view/${t.id ?? id}/` : null,
  };
}

/* ---- chats (recent list + one dialog) ---------------------------------- */

export interface BxChat {
  dialogId: string;
  title: string;
  type: string; // user | chat | ...
  lastMessage: string;
  lastDate: string | null;
  unread: boolean;
}

interface RawRecent {
  id: string | number;
  chat_id?: number;
  type: string;
  title: string;
  message?: { text?: string; date?: string };
  counter?: number;
}

export async function fetchChats(): Promise<BxChat[]> {
  const items = await call<RawRecent[]>("im.recent.get", { SKIP_OPENLINES: "Y" });
  return (items || []).map((r) => ({
    dialogId: r.type === "user" ? String(r.id) : `chat${r.chat_id ?? r.id}`,
    title: r.title,
    type: r.type,
    lastMessage: (r.message?.text || "").replace(/\[[^\]]*\]/g, "").trim(),
    lastDate: r.message?.date || null,
    unread: (r.counter ?? 0) > 0,
  }));
}

export interface BxMessage {
  id: number;
  authorId: number;
  author: string;
  text: string;
  date: string;
}

interface RawMessagesResult {
  messages: { id: number; author_id: number; text: string; date: string }[];
  users: { id: number; name: string }[];
}

export async function fetchMessages(dialogId: string, limit = 40): Promise<BxMessage[]> {
  const r = await call<RawMessagesResult>("im.dialog.messages.get", {
    DIALOG_ID: dialogId,
    LIMIT: limit,
  });
  const names = new Map((r.users || []).map((u) => [u.id, u.name]));
  return (r.messages || [])
    .map((m) => ({
      id: m.id,
      authorId: m.author_id,
      author: names.get(m.author_id) || (m.author_id ? `#${m.author_id}` : "Система"),
      text: (m.text || "").replace(/\[[^\]]*\]/g, "").trim(),
      date: m.date,
    }))
    .sort((a, b) => a.id - b.id);
}

/* ---- activity feed (лента) --------------------------------------------- */

export interface BxFeedPost {
  id: string;
  title: string;
  text: string;
  author: string | null;
  date: string | null;
}

interface RawPost {
  ID: string;
  TITLE?: string;
  DETAIL_TEXT?: string;
  DATE_PUBLISH?: string;
  AUTHOR_ID?: string;
}

export async function fetchFeed(limit = 20): Promise<BxFeedPost[]> {
  const posts = await call<RawPost[]>("log.blogpost.get", {});
  const slice = (posts || []).slice(0, limit);

  // Resolve author names in one batch (feed posts only carry AUTHOR_ID).
  const ids = [...new Set(slice.map((p) => p.AUTHOR_ID).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    try {
      const users = await call<{ ID: string; NAME?: string; LAST_NAME?: string }[]>("user.get", {
        FILTER: { ID: ids },
      });
      for (const u of users || []) names.set(u.ID, [u.NAME, u.LAST_NAME].filter(Boolean).join(" "));
    } catch {
      // names are cosmetic — show ids if user.get is not allowed by the webhook scope
    }
  }

  return slice.map((p) => ({
    id: p.ID,
    title: p.TITLE || "",
    text: (p.DETAIL_TEXT || "").replace(/\[[^\]]*\]/g, "").trim(),
    author: (p.AUTHOR_ID && (names.get(p.AUTHOR_ID) || `#${p.AUTHOR_ID}`)) || null,
    date: p.DATE_PUBLISH || null,
  }));
}
