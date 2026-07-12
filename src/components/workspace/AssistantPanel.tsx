"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sparkles, Send, Lock, Plus, Trash2, MessageSquare } from "lucide-react";
import { useSession } from "@/lib/session";
import { MiniMarkdown } from "./MiniMarkdown";

interface Msg { role: "user" | "assistant"; content: string }
interface Conversation { id: string; title: string; messages: Msg[]; updatedAt: number }
interface TgDialog { id: string; title: string; kind: string }

const STORE_KEY = "assistant:conversations";
const MAX_CONVERSATIONS = 50;
const DEFAULT_TG_COUNT = 50;

const SUGGESTIONS = [
  "@Чат 50 — что обсуждали?",
  "/task high Согласовать дедлайн",
  "Что горит сегодня?",
  "Собери задачи из переписки",
];

const now = () => Date.now();
const uid = () => crypto.randomUUID();

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч`;
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export function AssistantPanel() {
  const owner = useSession((s) => !!s.user?.owner);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [dialogs, setDialogs] = useState<TgDialog[]>([]);
  const [mentionAt, setMentionAt] = useState<number | null>(null);
  const [mentionQ, setMentionQ] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) setConversations(JSON.parse(raw) as Conversation[]);
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS))); } catch { /* quota */ }
  }, [conversations, loaded]);

  useEffect(() => {
    if (!owner) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/telegram?scope=dialogs&limit=1000");
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !alive) return;
        setDialogs((json.items as TgDialog[]) ?? []);
      } catch { /* telegram optional */ }
    })();
    return () => { alive = false; };
  }, [owner]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const mentionOptions = mentionAt !== null
    ? dialogs.filter((d) => d.title.toLowerCase().includes(mentionQ)).slice(0, 8)
    : [];

  function upsert(convo: Conversation) {
    setConversations((prev) => {
      const i = prev.findIndex((c) => c.id === convo.id);
      const next = i >= 0 ? prev.map((c) => (c.id === convo.id ? convo : c)) : [convo, ...prev];
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  function remove(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  const syncMention = useCallback((value: string, cursor: number) => {
    const before = value.slice(0, cursor);
    const m = before.match(/@([^\s@]*)$/);
    if (m) {
      setMentionAt(cursor - m[0].length);
      setMentionQ(m[1].toLowerCase());
    } else {
      setMentionAt(null);
      setMentionQ("");
    }
  }, []);

  function onDraftChange(value: string, cursor: number) {
    setDraft(value);
    syncMention(value, cursor);
  }

  function insertMention(title: string) {
    if (mentionAt === null) return;
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, mentionAt);
    const after = draft.slice(cursor);
    const insert = `@${title} ${DEFAULT_TG_COUNT} `;
    const next = before + insert + after;
    setDraft(next);
    setMentionAt(null);
    setMentionQ("");
    requestAnimationFrame(() => {
      el?.focus();
      const pos = before.length + insert.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || sending) return;

    setMentionAt(null);
    const base: Conversation = active ?? { id: uid(), title: q.slice(0, 48), messages: [], updatedAt: now() };
    const withUser: Conversation = { ...base, messages: [...base.messages, { role: "user", content: q }], updatedAt: now() };
    upsert(withUser);
    setActiveId(withUser.id);
    setDraft("");
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: withUser.messages }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      upsert({
        ...withUser,
        messages: [...withUser.messages, { role: "assistant", content: json.answer || "—" }],
        updatedAt: now(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (!owner) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-8 text-center">
        <Lock size={28} className="mb-3 text-vsc-muted" />
        <p className="text-[14px] text-vsc-text">Ассистент доступен только владельцу.</p>
        <p className="mt-1 text-[12px] text-vsc-muted">Он работает с твоими личными данными (почта, Telegram, задачи), поэтому закрыт для гостей.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-vsc-line">
        <div className="p-2">
          <button
            type="button"
            onClick={() => { setActiveId(null); setError(""); }}
            className="flex w-full items-center justify-center gap-1.5 rounded bg-vsc-accent px-3 py-2 text-[12px] text-white hover:opacity-90"
          >
            <Plus size={14} /> Новый чат
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-vsc-muted">Истории пока нет.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2 ${c.id === activeId ? "bg-vsc-hover" : "hover:bg-vsc-hover"}`}
              >
                <button type="button" onClick={() => { setActiveId(c.id); setError(""); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <MessageSquare size={13} className="shrink-0 text-vsc-muted" />
                  <div className="min-w-0">
                    <div className={`truncate text-[12.5px] ${c.id === activeId ? "text-vsc-bright" : "text-vsc-text"}`}>{c.title}</div>
                    <div className="text-[10px] text-vsc-muted">{relTime(c.updatedAt)}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  title="Удалить чат"
                  className="shrink-0 rounded p-1 text-vsc-muted opacity-0 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col px-6 py-4">
        <h1 className="mb-1 flex items-center gap-2 text-[16px] font-semibold text-vsc-bright">
          <Sparkles size={17} /> Ассистент
        </h1>
        <p className="mb-3 text-[12px] leading-relaxed text-vsc-muted">
          <code className="text-vsc-text">@Чат 100</code> или <code className="text-vsc-text">/tg Чат 100</code> — прочитать переписку.
          {" "}<code className="text-vsc-text">/task high Текст</code> — создать задачу с приоритетом.
        </p>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-vsc-line px-3 py-1.5 text-[12px] text-vsc-muted hover:border-vsc-accent hover:text-vsc-text"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user" ? "bg-vsc-accent/20 text-vsc-text" : "border border-vsc-line text-vsc-text"
                  }`}
                >
                  {m.role === "user"
                    ? <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    : <MiniMarkdown text={m.content} />}
                </div>
              </div>
            ))
          )}
          {sending && <p className="text-[12px] text-vsc-muted">Читаю данные и думаю…</p>}
          {error && <p className="text-[12px] text-vsc-yellow">{error}</p>}
        </div>

        <div className="relative mt-3 border-t border-vsc-line pt-3">
          {mentionOptions.length > 0 && (
            <div className="absolute bottom-full left-0 right-12 z-10 mb-1 max-h-40 overflow-y-auto rounded-lg border border-vsc-line bg-vsc-sidebar py-1 shadow-lg">
              {mentionOptions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => insertMention(d.title)}
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-vsc-text hover:bg-vsc-hover"
                >
                  {d.title}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value, e.target.selectionStart)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
                if (e.key === "Escape") setMentionAt(null);
              }}
              placeholder="@Чат 50 вопрос… или /task medium Задача"
              rows={1}
              className="max-h-32 min-h-[38px] flex-1 resize-none rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
            />
            <button
              type="button"
              onClick={() => ask(draft)}
              disabled={sending || !draft.trim()}
              title="Отправить"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded bg-vsc-accent text-white hover:opacity-90 disabled:opacity-40"
            >
              <Send size={16} className={sending ? "animate-pulse" : ""} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
