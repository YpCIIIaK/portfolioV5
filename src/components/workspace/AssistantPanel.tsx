"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Sparkles, Send, Lock } from "lucide-react";
import { useSession } from "@/lib/session";
import { MiniMarkdown } from "./MiniMarkdown";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Что горит сегодня?",
  "Кто ждёт моего ответа?",
  "Какие дедлайны на этой неделе?",
  "Собери задачи из непрочитанных сообщений",
];

export function AssistantPanel() {
  const owner = useSession((s) => !!s.user?.owner);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setDraft("");
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMessages((m) => [...m, { role: "assistant", content: json.answer || "—" }]);
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
    <div className="mx-auto flex h-full max-w-3xl flex-col px-8 py-5">
      <h1 className="mb-1 flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
        <Sparkles size={18} /> Ассистент
      </h1>
      <p className="mb-4 text-[12px] text-vsc-muted">
        Знает твои задачи, календарь, Bitrix, непрочитанное в Telegram и почте. Спрашивай про приоритеты, ответы, дедлайны.
      </p>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
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
        {sending && <p className="text-[12px] text-vsc-muted">Думаю…</p>}
        {error && <p className="text-[12px] text-vsc-yellow">{error}</p>}
      </div>

      <div className="mt-3 flex items-end gap-2 border-t border-vsc-line pt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); } }}
          placeholder="Спроси про свои дела…"
          rows={1}
          className="max-h-32 min-h-[38px] flex-1 resize-none rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
        />
        <button
          onClick={() => ask(draft)}
          disabled={sending || !draft.trim()}
          title="Отправить"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded bg-vsc-accent text-white hover:opacity-90 disabled:opacity-40"
        >
          <Send size={16} className={sending ? "animate-pulse" : ""} />
        </button>
      </div>
    </div>
  );
}
