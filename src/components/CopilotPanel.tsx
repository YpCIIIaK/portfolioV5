"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Globe, User, Loader2, FolderOpen } from "lucide-react";
import { useEditor } from "@/lib/store";
import { fileById } from "@/lib/files";
import { relevantFiles } from "@/lib/fileKeywords";
import { FileIcon } from "./FileIcon";
import { MiniMarkdown } from "./workspace/MiniMarkdown";

interface Msg {
  role: "user" | "assistant";
  content: string;
  files?: string[];
}

const SUGGESTIONS = {
  ru: ["Знает ли он Go?", "Покажи realtime-опыт", "Какой опыт с AI?", "Почему стоит его нанять?"],
  en: ["Does he know Go?", "Show realtime experience", "What's his AI experience?", "Why hire him?"],
};

const UI = {
  ru: {
    greeting: "👋 Привет! Я ИИ-ассистент Владимира. Спроси что угодно о его навыках, опыте и проектах — отвечу по реальным данным.",
    web: "Web + интернет",
    model: "Модель:",
    phWeb: "Спроси что угодно (с интернетом)…",
    phPortfolio: "Спроси о Владимире…",
    disclaimer: "AI может ошибаться · модель через OpenRouter",
    connErr: "⚠️ Ошибка соединения. Напишите напрямую: bigboyvova01@gmail.com",
  },
  en: {
    greeting: "👋 Hi! I'm Vladimir's AI assistant. Ask anything about his skills, experience and projects — I answer from real data.",
    web: "Web + internet",
    model: "Model:",
    phWeb: "Ask anything (with internet)…",
    phPortfolio: "Ask about Vladimir…",
    disclaimer: "AI can make mistakes · model via OpenRouter",
    connErr: "⚠️ Connection error. Email directly: bigboyvova01@gmail.com",
  },
};

const MODELS = [
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", label: "Fast", hint: "~1с" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Balanced", hint: "~9с" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Max", hint: "медленно" },
];

export function CopilotPanel() {
  const open = useEditor((s) => s.chatOpen);
  const toggleChat = useEditor((s) => s.toggleChat);
  const unlock = useEditor((s) => s.unlock);
  const openFile = useEditor((s) => s.openFile);
  const lang = useEditor((s) => s.lang);
  const t = UI[lang];
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"portfolio" | "web">("portfolio");
  const [model, setModel] = useState(MODELS[0].id);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    unlock("ai");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, mode, model, lang }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }

      // The agent "opens" the file most related to the question + answer.
      const files = relevantFiles(`${q} ${acc}`);
      if (files.length) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc, files };
          return copy;
        });
        if (mode === "portfolio") openFile(files[0]);
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: t.connErr,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-[360px] max-w-[88vw] shrink-0 flex-col border-l border-vsc-line bg-vsc-sidebar no-select">
      {/* header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-vsc-line px-3">
        <div className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-vsc-text">
          <Sparkles size={14} className="text-vsc-accent" /> Copilot · Ask about Vladimir
        </div>
        <button onClick={toggleChat} className="rounded p-1 text-vsc-muted hover:bg-white/10 hover:text-vsc-text">
          <X size={15} />
        </button>
      </div>

      {/* mode toggle */}
      <div className="flex shrink-0 gap-1 border-b border-vsc-line px-2 pt-2">
        <ModeBtn active={mode === "portfolio"} onClick={() => setMode("portfolio")} icon={<Sparkles size={12} />} label="Portfolio" />
        <ModeBtn active={mode === "web"} onClick={() => setMode("web")} icon={<Globe size={12} />} label={t.web} />
      </div>
      {/* model selector */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-vsc-line px-2 py-1.5 text-[11px] text-vsc-muted">
        <span>{t.model}</span>
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            title={m.id}
            className={`rounded px-1.5 py-0.5 ${
              model === m.id ? "bg-vsc-accent text-white" : "hover:bg-vsc-hover hover:text-vsc-text"
            }`}
          >
            {m.label}
            <span className="ml-1 opacity-60">{m.hint}</span>
          </button>
        ))}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-vsc-muted">
              {t.greeting}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS[lang].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-vsc-line bg-[var(--vsc-bg)] px-2.5 py-1 text-[12px] text-vsc-light-blue hover:border-vsc-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} msg={m} streaming={busy && i === messages.length - 1} onOpenFile={openFile} />
        ))}
      </div>

      {/* input */}
      <div className="shrink-0 border-t border-vsc-line p-2">
        <div className="flex items-end gap-2 rounded border border-vsc-line bg-[var(--vsc-bg)] px-2 py-1.5 focus-within:border-vsc-accent">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={mode === "web" ? t.phWeb : t.phPortfolio}
            className="max-h-24 flex-1 resize-none bg-transparent text-[13px] text-vsc-text outline-none placeholder:text-vsc-muted"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="rounded p-1 text-vsc-accent hover:bg-white/10 disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="mt-1 px-1 text-[10px] text-vsc-muted">
          {t.disclaimer}
        </p>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[12px] transition ${
        active ? "bg-vsc-accent text-white" : "text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function Bubble({ msg, streaming, onOpenFile }: { msg: Msg; streaming: boolean; onOpenFile: (id: string) => void }) {
  const lang = useEditor((s) => s.lang);
  const isUser = msg.role === "user";
  const files = (msg.files ?? []).map((id) => fileById(id)).filter((f): f is NonNullable<typeof f> => !!f);
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-vsc-accent text-white" : "bg-[var(--vsc-line)] text-vsc-accent"
        }`}
      >
        {isUser ? <User size={13} /> : <Sparkles size={13} />}
      </div>
      <div className={`flex max-w-[78%] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
            isUser ? "bg-vsc-accent text-white" : "bg-[var(--vsc-bg)] text-vsc-text"
          }`}
        >
          {!isUser && !streaming && msg.content
            ? <MiniMarkdown text={msg.content} />
            : <>{msg.content || (streaming ? "…" : "")}{streaming && msg.content && <span className="cursor-blink">▋</span>}</>}
        </div>

        {!isUser && files.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-vsc-muted">
              <FolderOpen size={11} /> {lang === "en" ? "related" : "по теме"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onOpenFile(f.id)}
                  className="flex items-center gap-1.5 rounded border border-vsc-line bg-[var(--vsc-bg)] px-2 py-1 text-[12px] text-vsc-light-blue hover:border-vsc-accent"
                >
                  <FileIcon name={f.name} /> {f.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
