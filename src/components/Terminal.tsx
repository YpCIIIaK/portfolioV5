"use client";

import { useEffect, useRef, useState } from "react";
import { X, TerminalIcon } from "lucide-react";
import { useEditor } from "@/lib/store";
import { allFiles, GITHUB } from "@/lib/files";

interface Line {
  type: "in" | "out";
  text: string;
}

const PROMPT = "vladimir@portfolio:~$";

const BANNER = [
  "Welcome to portfolio shell v5.0  •  type `help` to begin",
];

export function Terminal() {
  const open = useEditor((s) => s.terminalOpen);
  const setTerminal = useEditor((s) => s.setTerminal);
  const openFile = useEditor((s) => s.openFile);
  const unlock = useEditor((s) => s.unlock);
  const [lines, setLines] = useState<Line[]>(
    BANNER.map((t) => ({ type: "out", text: t }))
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, lines]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  if (!open) return null;

  const print = (out: string[]) =>
    setLines((l) => [...l, ...out.map((text) => ({ type: "out" as const, text }))]);

  const run = (raw: string) => {
    const cmd = raw.trim();
    setLines((l) => [...l, { type: "in", text: cmd }]);
    if (cmd) {
      setHistory((h) => [...h, cmd]);
      setHIdx(-1);
    }
    const [name, ...args] = cmd.split(/\s+/);

    switch (name) {
      case "":
        break;
      case "help":
        print([
          "Available commands:",
          "  whoami           кто я",
          "  about            краткое био",
          "  ls [dir]         список файлов / папок",
          "  cat <file>       открыть файл в редакторе",
          "  skills           технический стек",
          "  projects         список проектов",
          "  git log          последние коммиты",
          "  social           ссылки и контакты",
          "  clear            очистить терминал",
        ]);
        break;
      case "whoami":
        print(["Vladimir — Fullstack Developer (frontend → backend).", "Astana / remote. Open to work."]);
        break;
      case "about":
        print([
          "2+ года: пет-проекты, 2 стартапа, коммерческая разработка ботов.",
          "Frontend (React/TS/Next) + Backend (Go-агенты, Node, PHP/Symfony) + AI.",
          "Tip: `cat about/about.md`",
        ]);
        break;
      case "ls": {
        const dir = args[0]?.replace(/\/$/, "");
        if (!dir) {
          print(["about/  projects/  experience/  contact/  README.md"]);
        } else {
          const inDir = allFiles.filter((f) => f.id.startsWith(dir + "/"));
          if (inDir.length) print([inDir.map((f) => f.name).join("   ")]);
          else print([`ls: ${dir}: No such directory`]);
        }
        break;
      }
      case "projects":
        print(allFiles.filter((f) => f.id.startsWith("projects/")).map((f) => "  " + f.name));
        break;
      case "cat": {
        const target = args[0];
        const f =
          allFiles.find((x) => x.id === target) ||
          allFiles.find((x) => x.name === target) ||
          allFiles.find((x) => x.id.endsWith("/" + target));
        if (f) {
          openFile(f.id);
          print([`Opening ${f.id} in editor →`]);
        } else {
          print([`cat: ${target ?? ""}: No such file. Try \`ls\`.`]);
        }
        break;
      }
      case "skills":
        print([
          "frontend : React 18/19 · TypeScript · Next.js · Angular 19 · Vue 3",
          "backend  : Go (gopsutil, gorilla/ws) · Node.js · PHP/Symfony · Python",
          "realtime : WebSocket auto-reconnect · multiplexed streams",
          "ai       : OpenRouter · Claude API · RAG · multi-agent chains",
        ]);
        break;
      case "git":
        if (args[0] === "log")
          print([
            "a1b2c3d feat: multi-agent arena — visual chain builder",
            "e4f5g6h perf: instant per-process CPU via time-delta",
            "i7j8k9l feat: backfill totalExperience for 227k docs",
          ]);
        else print(["usage: git log"]);
        break;
      case "social":
      case "contact":
        print([`GitHub : ${GITHUB}`, "Email  : bigboyvova01@gmail.com", "Tip: `cat contact/contact.tsx` для формы"]);
        break;
      case "clear":
        setLines([]);
        return;
      case "sudo":
        print(["Nice try 😏  permission denied."]);
        unlock("sudo");
        break;
      case "echo":
        print([args.join(" ")]);
        break;
      default:
        print([`command not found: ${name}. Type \`help\`.`]);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const idx = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(idx);
      setInput(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < 0) return;
      const idx = hIdx + 1;
      if (idx >= history.length) {
        setHIdx(-1);
        setInput("");
      } else {
        setHIdx(idx);
        setInput(history[idx]);
      }
    }
  };

  return (
    <div className="flex h-56 shrink-0 flex-col border-t border-vsc-line bg-[#1e1e1e]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-vsc-line px-3 no-select">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-vsc-text">
          <TerminalIcon size={14} /> Terminal
        </div>
        <button
          onClick={() => setTerminal(false)}
          className="rounded p-1 text-vsc-muted hover:bg-white/10 hover:text-vsc-text"
        >
          <X size={15} />
        </button>
      </div>

      <div
        className="min-h-0 flex-1 cursor-text overflow-y-auto px-3 py-2 font-mono text-[12.5px] leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l, i) =>
          l.type === "in" ? (
            <div key={i} className="flex gap-2">
              <span className="text-vsc-green">{PROMPT}</span>
              <span className="text-vsc-text">{l.text}</span>
            </div>
          ) : (
            <div key={i} className="whitespace-pre-wrap text-vsc-muted">
              {l.text}
            </div>
          )
        )}
        <div className="flex gap-2">
          <span className="text-vsc-green">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-vsc-text caret-vsc-green outline-none"
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
