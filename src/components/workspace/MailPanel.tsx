"use client";

import { useRef, useState } from "react";
import { Mail, RefreshCw, ArrowLeft, Dot } from "lucide-react";
import { mailRead, demoRead, type MailFull } from "@/lib/mail";
import { useMailbox } from "./useMailbox";

/**
 * Renders an HTML email in a sandboxed iframe. No `allow-scripts`, so embedded
 * JS can't run; `allow-same-origin` only so we can measure the content height.
 * Links open in a new tab via an injected <base>.
 */
function HtmlMail({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  const srcDoc = `<base target="_blank">${html}`;

  function resize() {
    const doc = ref.current?.contentDocument;
    if (doc?.body) setHeight(doc.documentElement.scrollHeight || doc.body.scrollHeight || 400);
  }

  return (
    <iframe
      ref={ref}
      title="email"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      onLoad={resize}
      className="w-full rounded border border-vsc-line bg-white"
      style={{ height }}
    />
  );
}

function when(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
}

export function MailPanel() {
  const { items, loading, error, live, reload } = useMailbox(200);
  const [open, setOpen] = useState<MailFull | null>(null);
  const [reading, setReading] = useState(false);

  async function read(uid: number) {
    setReading(true);
    setOpen(null);
    try {
      setOpen(live ? await mailRead(uid) : demoRead(uid));
    } catch {
      setOpen(null);
    } finally {
      setReading(false);
    }
  }

  if (open || reading) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-5">
        <button
          onClick={() => setOpen(null)}
          className="mb-4 flex items-center gap-1.5 text-[13px] text-vsc-muted hover:text-vsc-text"
        >
          <ArrowLeft size={15} /> К списку
        </button>
        {reading && !open ? (
          <p className="text-[13px] text-vsc-muted">Загрузка письма…</p>
        ) : open ? (
          <article>
            <h1 className="text-[20px] font-semibold text-vsc-bright">{open.subject}</h1>
            <div className="mt-1 flex items-center gap-2 text-[13px] text-vsc-muted">
              <span className="text-vsc-text">{open.from}</span>
              <Dot size={14} />
              <span>{when(open.date)}</span>
            </div>
            {open.html ? (
              <div className="mt-4">
                <HtmlMail html={open.html} />
              </div>
            ) : (
              <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-vsc-text">
                {open.body}
              </pre>
            )}
          </article>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <Mail size={18} /> Почта
          {!live && <span className="rounded bg-vsc-line px-1.5 py-0.5 text-[11px] font-normal text-vsc-muted">демо</span>}
        </h1>
        <button
          onClick={reload}
          title="Обновить"
          className="rounded p-1.5 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && <p className="mb-3 text-[13px] text-vsc-yellow">{error}</p>}
      {loading ? (
        <p className="text-[13px] text-vsc-muted">Загрузка почты…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">Входящих нет.</p>
      ) : (
        <div className="divide-y divide-vsc-line">
          {items.map((m) => (
            <button
              key={m.uid}
              onClick={() => read(m.uid)}
              className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-vsc-hover"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${m.unread ? "bg-vsc-accent" : "bg-transparent"}`} />
              <span className={`w-40 shrink-0 truncate text-[13px] ${m.unread ? "font-semibold text-vsc-bright" : "text-vsc-text"}`}>
                {m.from || "—"}
              </span>
              <span className={`flex-1 truncate text-[13px] ${m.unread ? "text-vsc-text" : "text-vsc-muted"}`}>
                {m.subject}
              </span>
              <span className="shrink-0 text-[12px] text-vsc-muted">{when(m.date)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
