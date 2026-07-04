"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LogIn, Send, Trash2, MessageSquareHeart } from "lucide-react";
import { useSession } from "@/lib/session";

interface Entry {
  id: string;
  github_id: number;
  login: string;
  name: string;
  avatar: string;
  message: string;
  created_at: string;
}

/** Demo entries shown when Supabase isn't configured (local dev, forks). */
const DEMO: Entry[] = [
  {
    id: "demo-1",
    github_id: 0,
    login: "octocat",
    name: "Octocat",
    avatar: "",
    message: "Классная идея с VSCode-портфолио! Терминал внизу — 🔥",
    created_at: new Date(Date.now() - 3 * 86400e3).toISOString(),
  },
];

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "только что";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} дн назад` : new Date(iso).toLocaleDateString("ru-RU");
}

export function GuestbookPanel() {
  const { user, configured } = useSession();
  const [items, setItems] = useState<Entry[]>([]);
  const [live, setLive] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/guestbook", { cache: "no-store" });
        const data = (await res.json()) as { items: Entry[]; configured: boolean };
        if (cancelled) return;
        setLive(data.configured);
        setItems(data.configured ? data.items : DEMO);
      } catch {
        if (!cancelled) setItems(DEMO);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function send() {
    const m = msg.trim();
    if (!m || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не получилось отправить");
      setItems([data.item as Entry, ...items]);
      setMsg("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось отправить");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    setItems(items.filter((x) => x.id !== id));
    await fetch(`/api/guestbook?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  const canDelete = (e: Entry) => !!user && (user.owner || user.login === e.login);

  return (
    <div className="mx-auto max-w-2xl px-8 pb-12">
      {/* composer */}
      {user ? (
        <div className="mb-5 rounded-lg border border-vsc-line bg-vsc-sidebar p-3">
          <div className="flex items-start gap-2">
            {user.avatar && <Image src={user.avatar} alt="" width={28} height={28} className="mt-0.5 rounded-full" />}
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
              }}
              maxLength={500}
              rows={2}
              placeholder="Оставь пару слов — что понравилось, что улучшить…"
              className="min-h-[52px] flex-1 resize-y rounded border border-vsc-line bg-vsc-bg px-3 py-2 text-[13.5px] text-vsc-text outline-none focus:border-vsc-accent"
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-vsc-muted">{msg.length}/500 · Ctrl+Enter — отправить</span>
            <button
              onClick={send}
              disabled={sending || msg.trim().length < 2 || !live}
              className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send size={13} /> {sending ? "Отправка…" : "Отправить"}
            </button>
          </div>
          {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
          {!live && <p className="mt-2 text-[12px] text-vsc-muted">Supabase не настроен — записи не сохранятся.</p>}
        </div>
      ) : (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-vsc-line bg-vsc-sidebar px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] text-vsc-text">
            <MessageSquareHeart size={16} className="text-vsc-accent" />
            Войди через GitHub, чтобы оставить запись
          </span>
          {configured && (
            <a
              href="/api/auth/login"
              className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90"
            >
              <LogIn size={14} /> Войти
            </a>
          )}
        </div>
      )}

      {/* entries */}
      <div className="flex flex-col gap-2">
        {items.map((e) => (
          <div key={e.id} className="group flex gap-2.5 rounded-lg border border-vsc-line bg-vsc-sidebar p-3">
            {e.avatar ? (
              <Image src={e.avatar} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vsc-accent/30 text-[13px] text-vsc-bright">
                {(e.name || e.login).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <a
                  href={`https://github.com/${e.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[13px] font-medium text-vsc-bright hover:underline"
                >
                  {e.name || e.login}
                </a>
                <span className="shrink-0 text-[11px] text-vsc-muted">{timeAgo(e.created_at)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-vsc-text">{e.message}</p>
            </div>
            {canDelete(e) && (
              <button
                onClick={() => remove(e.id)}
                title="Удалить"
                className="h-fit rounded p-1 text-vsc-muted opacity-0 transition hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-[13px] text-vsc-muted">Записей пока нет — будь первым!</p>}
      </div>
    </div>
  );
}
