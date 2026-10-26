"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Check, CheckCircle2, Copy, FileText, FolderGit2, Loader2, Mail, Send } from "lucide-react";
import { track } from "@/lib/track";
import { Reveal, SectionHead, card, useL } from "./ui";

const EMAIL = "bigboyvova01@gmail.com";

export function Contact() {
  const { l } = useL();
  const [form, setForm] = useState({ name: "", channel: "telegram" as "email" | "telegram", contact: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? l("Ошибка отправки", "Sending failed"));
      track("⭐ отправил форму (6.0)");
      setStatus("ok");
      setForm({ name: "", channel: form.channel, contact: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const input =
    "w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5 text-[14px] outline-none transition focus:border-[rgb(var(--a)/0.6)] focus:shadow-[0_0_0_3px_rgb(var(--a)/0.15)]";
  const links = [
    { href: "https://t.me/bigboyvova", label: "Telegram", sub: "@bigboyvova", Icon: Send },
    { href: "https://github.com/YpCIIIaK", label: "GitHub", sub: "YpCIIIaK", Icon: FolderGit2 },
    { href: "/cv", label: l("Резюме", "Resume"), sub: "PDF", Icon: FileText },
  ];

  return (
    <section id="contact" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
      <SectionHead
        id="contact"
        kicker={l("05 · контакты", "05 · contact")}
        title={l("Давайте поработаем вместе", "Let's work together")}
        sub={l(
          "Ищу удалённую работу: full-time, part-time, контракт или проект. Быстрее всего отвечаю в Telegram.",
          "Looking for remote work: full-time, part-time, contract or project. Telegram is the fastest way to reach me.",
        )}
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <Reveal className="space-y-3 lg:col-span-2">
          {links.map(({ href, label, sub, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`${card} group flex items-center gap-4 p-4`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(var(--a))] to-[rgb(var(--b))] text-white transition group-hover:scale-105">
                <Icon size={18} />
              </span>
              <span>
                <span className="block font-medium">{label}</span>
                <span className="text-[13px] text-[var(--muted)]">{sub}</span>
              </span>
            </a>
          ))}
          <div className={`${card} flex items-center gap-4 p-4`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(var(--a))] to-[rgb(var(--b))] text-white">
              <Mail size={18} />
            </span>
            <a href={`mailto:${EMAIL}`} className="min-w-0 flex-1">
              <span className="block font-medium">Email</span>
              <span className="block truncate text-[13px] text-[var(--muted)]">{EMAIL}</span>
            </a>
            <button
              onClick={copy}
              aria-label={l("Скопировать email", "Copy email")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] hover:text-[var(--fg)]"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-3">
          <form onSubmit={submit} className={`${card} space-y-3 p-5 sm:p-6`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                maxLength={100}
                placeholder={l("Имя или компания", "Name or company")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={input}
              />
              <div className="flex gap-2">
                <div className="flex rounded-xl border border-[var(--line)] bg-[var(--bg)] p-1">
                  {(["telegram", "email"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, channel: c })}
                      className={`relative rounded-lg px-2.5 text-[12.5px] ${form.channel === c ? "text-[var(--fg)]" : "text-[var(--muted)]"}`}
                    >
                      {form.channel === c && <motion.span layoutId="v6-channel" className="absolute inset-0 rounded-lg bg-[rgb(var(--a)/0.2)]" />}
                      <span className="relative">{c === "telegram" ? "TG" : "Email"}</span>
                    </button>
                  ))}
                </div>
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  placeholder={form.channel === "telegram" ? "@username" : "you@company.com"}
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className={input}
                />
              </div>
            </div>
            <textarea
              required
              minLength={5}
              maxLength={4000}
              rows={5}
              placeholder={l("Расскажите о вакансии или проекте…", "Tell me about the role or project…")}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={`${input} resize-none`}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={status === "sending"}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))] px-5 py-2.5 text-[14px] font-medium text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {status === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {l("Отправить", "Send")}
              </button>
              {status === "ok" && (
                <span className="flex items-center gap-1.5 text-[13.5px] text-emerald-400">
                  <CheckCircle2 size={16} /> {l("Отправлено, скоро отвечу!", "Sent — I'll reply soon!")}
                </span>
              )}
              {status === "error" && (
                <span className="flex items-center gap-1.5 text-[13.5px] text-rose-400">
                  <AlertCircle size={16} /> {error}
                </span>
              )}
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
