"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, FolderGit2, Loader2, Send, Star, TerminalSquare, TrendingDown, TrendingUp } from "lucide-react";
import { ContributionGrid } from "@/components/ContributionGrid";
import { PROJECTS, SKILLS, CONTACTS, SUMMARY } from "@/lib/profile";
import { track } from "@/lib/track";
import { Reveal, SectionHead, card, useL } from "./ui";

interface GhData {
  profile: { publicRepos: number; followers: number };
  totalStars: number;
  languages: { name: string; count: number }[];
  topRepos: { name: string; url: string; language: string | null; stars: number; description: string | null }[];
}

const LANG_COLORS = ["rgb(var(--a))", "rgb(var(--b))", "#f59e0b", "#10b981", "#f43f5e", "#a3a3a3", "#eab308", "#06b6d4"];

function GitHubCard() {
  const { l } = useL();
  const [d, setD] = useState<GhData | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("/api/github")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setErr(true));
  }, []);
  const total = d?.languages.reduce((a, x) => a + x.count, 0) ?? 1;

  return (
    <div className={`${card} h-full p-5`}>
      <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
        <FolderGit2 size={15} /> GitHub API · {l("обновляется раз в час", "refreshed hourly")}
      </div>
      {err && (
        <p className="mt-4 text-[14px] text-[var(--muted)]">
          {l("Статистика GitHub сейчас недоступна — ", "GitHub stats are unavailable right now — ")}
          <a href="https://github.com/YpCIIIaK" target="_blank" rel="noreferrer" className="text-[rgb(var(--a))] underline">
            {l("открыть профиль", "open the profile")}
          </a>
          .
        </p>
      )}
      {!d && !err && <Loader2 className="mt-6 animate-spin text-[var(--muted)]" />}
      {d && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              [d.profile.publicRepos, l("репозиториев", "repositories")],
              [d.totalStars, l("звёзд", "stars")],
              [d.profile.followers, l("подписчиков", "followers")],
            ].map(([n, label]) => (
              <div key={label as string}>
                <div className="text-2xl font-semibold">{n}</div>
                <div className="text-[12px] text-[var(--muted)]">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full">
            {d.languages.map((x, i) => (
              <motion.div
                key={x.name}
                initial={{ width: 0 }}
                whileInView={{ width: `${(x.count / total) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.05 }}
                style={{ background: LANG_COLORS[i % LANG_COLORS.length] }}
                title={x.name}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
            {d.languages.map((x, i) => (
              <span key={x.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} />
                {x.name}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {d.topRepos.slice(0, 4).map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[var(--line)] p-3 transition hover:border-[rgb(var(--a)/0.45)]"
              >
                <div className="flex items-center justify-between gap-2 text-[13.5px] font-medium">
                  <span className="truncate">{r.name}</span>
                  <span className="flex shrink-0 items-center gap-1 text-[12px] text-[var(--muted)]">
                    <Star size={12} /> {r.stars}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-[var(--muted)]">{r.description ?? r.language ?? ""}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Live BTC price over Binance WebSocket with a small sparkline — the same feed as the IDE status bar. */
function TickerCard() {
  const { l } = useL();
  const [pts, setPts] = useState<number[]>([]);
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const connect = () => {
      ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@miniTicker");
      ws.onmessage = (ev) => {
        try {
          const p = +JSON.parse(ev.data).c;
          if (p) setPts((a) => [...a.slice(-59), p]);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (!closed) timer = setTimeout(connect, 4000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, []);

  const last = pts[pts.length - 1];
  const first = pts[0];
  const up = last >= first;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const path = pts
    .map((p, i) => `${(i / Math.max(1, pts.length - 1)) * 100},${max === min ? 20 : 38 - ((p - min) / (max - min)) * 36}`)
    .join(" ");

  return (
    <div className={`${card} flex h-full flex-col p-5`}>
      <div className="flex items-center justify-between text-[13px] text-[var(--muted)]">
        <span>Binance WebSocket</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> real-time
        </span>
      </div>
      <div className="mt-4 text-[13px] text-[var(--muted)]">BTC / USDT</div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">
          {last ? `$${last.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "…"}
        </span>
        {pts.length > 1 && (
          <span className={`flex items-center gap-0.5 text-[13px] ${up ? "text-emerald-400" : "text-rose-400"}`}>
            {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {(((last - first) / first) * 100).toFixed(3)}%
          </span>
        )}
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-auto h-20 w-full pt-3">
        {pts.length > 1 && (
          <polyline
            points={path}
            fill="none"
            stroke={up ? "#34d399" : "#fb7185"}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <p className="text-[12px] text-[var(--muted)]">
        {l("Опыт с данными в реальном времени — со времён криптостартапа.", "Real-time data experience from the crypto startup days.")}
      </p>
    </div>
  );
}

/** A tiny client-side terminal: a taste of the IDE version. */
function MiniTerminal() {
  const { l, tr, en } = useL();
  const [lines, setLines] = useState<{ cmd?: string; out: string }[]>([
    { out: en ? "Type help and press Enter." : "Введите help и нажмите Enter." },
  ]);
  const [input, setInput] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    track(`терминал 6.0: ${cmd}`);
    let out: string;
    switch (cmd) {
      case "help":
        out = "whoami · projects · skills · contacts · date · clear";
        break;
      case "whoami":
        out = tr(SUMMARY);
        break;
      case "projects":
        out = PROJECTS.map((p) => `• ${p.title}`).join("\n");
        break;
      case "skills":
        out = [...SKILLS.languages, ...SKILLS.frontend.slice(0, 6), ...SKILLS.backend.slice(0, 5)].join(", ");
        break;
      case "contacts":
        out = CONTACTS.map((c) => `${c.label}: ${c.href.replace("mailto:", "")}`).join("\n");
        break;
      case "date":
        out = new Date().toString();
        break;
      case "clear":
        setLines([]);
        return;
      case "sudo hire vladimir":
      case "hire":
        out = en ? "✔ Great choice. Telegram: @bigboyvova" : "✔ Отличный выбор. Telegram: @bigboyvova";
        break;
      default:
        out = en ? `command not found: ${cmd}` : `команда не найдена: ${cmd}`;
    }
    setLines((a) => [...a, { cmd: raw, out }]);
  };

  return (
    <div className={`${card} flex h-full flex-col overflow-hidden font-mono text-[12.5px]`}>
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5 text-[12px] text-[var(--muted)]">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </span>
        <TerminalSquare size={13} className="ml-1" /> vladimir@portfolio
      </div>
      <div ref={box} className="h-56 overflow-y-auto px-4 py-3" onClick={() => document.getElementById("v6-term-input")?.focus()}>
        {lines.map((x, i) => (
          <div key={i} className="mb-1.5">
            {x.cmd !== undefined && (
              <div>
                <span className="text-[rgb(var(--a))]">❯</span> {x.cmd}
              </div>
            )}
            <div className="whitespace-pre-wrap text-[var(--muted)]">{x.out}</div>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
            setInput("");
          }}
          className="flex items-center gap-2"
        >
          <span className="text-[rgb(var(--a))]">❯</span>
          <input
            id="v6-term-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={l("Команда терминала", "Terminal command")}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none"
          />
        </form>
      </div>
    </div>
  );
}

/** Ask the site's AI assistant (same /api/chat as the IDE Copilot panel). */
function AskAi() {
  const { l, lang } = useL();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const examples = [
    l("Какой у тебя опыт с React?", "What's your React experience?"),
    l("Расскажи про Repo Janitor", "Tell me about Repo Janitor"),
    l("Готов к удалёнке?", "Are you open to remote work?"),
  ];

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    track("⭐ спросил AI (6.0)");
    setQ(question);
    setBusy(true);
    setAnswer("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: question }], mode: "portfolio", lang }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAnswer(acc);
      }
    } catch {
      setAnswer(l("Ассистент сейчас недоступен, напишите мне в Telegram.", "The assistant is unavailable, message me on Telegram."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${card} flex h-full flex-col p-5`}>
      <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
        <Bot size={15} /> {l("AI-ассистент · OpenRouter, отвечает по моему резюме", "AI assistant · OpenRouter, answers from my resume")}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={l("Спросите что-нибудь обо мне…", "Ask anything about me…")}
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5 text-[14px] outline-none focus:border-[rgb(var(--a)/0.6)]"
        />
        <button
          disabled={busy}
          aria-label={l("Спросить", "Ask")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))] text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((x) => (
          <button
            key={x}
            onClick={() => ask(x)}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-[12px] text-[var(--muted)] hover:text-[var(--fg)]"
          >
            {x}
          </button>
        ))}
      </div>
      {(answer || busy) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 text-[14px] leading-relaxed"
        >
          {answer || <span className="text-[var(--muted)]">{l("Думаю…", "Thinking…")}</span>}
        </motion.div>
      )}
    </div>
  );
}

export function Live() {
  const { l } = useL();
  return (
    <section id="live" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
      <SectionHead
        id="live"
        kicker={l("02 · вживую", "02 · live")}
        title={l("Интеграции, которые работают прямо сейчас", "Integrations running right now")}
        sub={l(
          "Не скриншоты: живые данные GitHub и Binance, AI-ассистент и терминал из версии VS Code.",
          "Not screenshots: live GitHub and Binance data, the AI assistant and the terminal from the VS Code version.",
        )}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <GitHubCard />
        </Reveal>
        <Reveal delay={0.08}>
          <TickerCard />
        </Reveal>
        <Reveal className="lg:col-span-2">
          <AskAi />
        </Reveal>
        <Reveal delay={0.08}>
          <MiniTerminal />
        </Reveal>
        <Reveal className="lg:col-span-3">
          <div className={`${card} overflow-x-auto p-5`}>
            <div className="mb-3 text-[13px] text-[var(--muted)]">{l("Активность за год · GitHub + GitFlic", "Activity over the year · GitHub + GitFlic")}</div>
            <ContributionGrid />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
