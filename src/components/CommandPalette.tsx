"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { allFiles, GITHUB, DEFAULT_OPEN } from "@/lib/files";
import { useEditor } from "@/lib/store";
import { FileIcon } from "./FileIcon";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
}

/** Copy a shareable deep link to whatever file is currently active. */
function copyCurrentLink() {
  const id = useEditor.getState().activeFile;
  const base = window.location.origin + window.location.pathname;
  const url = id && id !== DEFAULT_OPEN ? `${base}?file=${encodeURIComponent(id)}` : base;
  navigator.clipboard?.writeText(url).catch(() => {});
}

export function CommandPalette() {
  const open = useEditor((s) => s.paletteOpen);
  const setPalette = useEditor((s) => s.setPalette);
  const openFile = useEditor((s) => s.openFile);
  const toggleTerminal = useEditor((s) => s.toggleTerminal);
  const setActivityView = useEditor((s) => s.setActivityView);
  const setTour = useEditor((s) => s.setTour);
  const toggleChat = useEditor((s) => s.toggleChat);
  const toggleMinimap = useEditor((s) => s.toggleMinimap);

  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const fileCmds: Cmd[] = allFiles.map((f) => ({
      id: "file:" + f.id,
      label: f.name,
      hint: f.id,
      icon: <FileIcon name={f.name} />,
      run: () => openFile(f.id),
    }));
    const actions: Cmd[] = [
      { id: "act:copilot", label: "AI: Ask Copilot about Vladimir", hint: "Ctrl+I", run: toggleChat },
      { id: "act:share", label: "Share: Copy Link to Current File", run: copyCurrentLink },
      { id: "act:terminal", label: "View: Toggle Terminal", hint: "Ctrl+`", run: toggleTerminal },
      { id: "act:minimap", label: "View: Toggle Minimap", run: toggleMinimap },
      { id: "act:explorer", label: "View: Show Explorer", run: () => setActivityView("explorer") },
      { id: "act:git", label: "View: Show Source Control", run: () => setActivityView("git") },
      { id: "act:github", label: "Open GitHub Profile", hint: GITHUB, run: () => window.open(GITHUB, "_blank") },
      { id: "act:tour", label: "Help: Restart Site Tour", run: () => setTour(true) },
    ];
    return [...actions, ...fileCmds];
  }, [openFile, toggleTerminal, setActivityView, setTour, toggleChat, toggleMinimap]);

  const filtered = useMemo(() => {
    if (!q) return commands;
    const lower = q.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        c.hint?.toLowerCase().includes(lower)
    );
  }, [q, commands]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setSel(0), [q]);

  if (!open) return null;

  const choose = (c?: Cmd) => {
    if (!c) return;
    c.run();
    setPalette(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(filtered[sel]);
    } else if (e.key === "Escape") {
      setPalette(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center pt-[10vh]"
      onClick={() => setPalette(false)}
    >
      <div
        className="h-fit w-[600px] max-w-[90vw] overflow-hidden rounded-md border border-vsc-line bg-[#252526] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a command or file name…"
          className="w-full border-b border-vsc-line bg-[#3c3c3c] px-3 py-2 text-[13px] text-vsc-text outline-none placeholder:text-vsc-muted"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setSel(i)}
              onClick={() => choose(c)}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] ${
                i === sel ? "bg-vsc-active-row text-vsc-bright" : "text-vsc-text"
              }`}
            >
              {c.icon}
              <span className="flex-1 truncate">{c.label}</span>
              {c.hint && (
                <span className="truncate text-[11px] text-vsc-muted">
                  {c.hint}
                </span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-[12px] text-vsc-muted">
              No matching commands
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
