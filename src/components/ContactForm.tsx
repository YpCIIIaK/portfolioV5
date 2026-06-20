"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Status = "idle" | "sending" | "ok" | "error";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка отправки");
      setStatus("ok");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Ваше имя"
        />
        <Field
          label="email"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="mb-1 block font-mono text-[11px] text-vsc-muted">
          message
        </label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Расскажите о вакансии или проекте…"
          rows={5}
          className="w-full resize-none rounded border border-vsc-line bg-[#1e1e1e] px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="flex items-center gap-2 rounded bg-vsc-accent px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "sending" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Отправить
        </button>

        {status === "ok" && (
          <span className="flex items-center gap-1.5 text-[13px] text-vsc-green">
            <CheckCircle2 size={15} /> Отправлено — спасибо!
          </span>
        )}
        {status === "error" && (
          <span className="flex items-center gap-1.5 text-[13px] text-[#f48771]">
            <AlertCircle size={15} /> {error}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[11px] text-vsc-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-vsc-line bg-[#1e1e1e] px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
      />
    </div>
  );
}
