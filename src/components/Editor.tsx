"use client";

import { useState } from "react";
import { X, Command, Link2, Check } from "lucide-react";
import { useEditor } from "@/lib/store";
import { fileById, DEFAULT_OPEN } from "@/lib/files";
import { FileIcon } from "./FileIcon";
import { BlockRenderer } from "./BlockRenderer";
import { ContactForm } from "./ContactForm";
import { GitHubPanel } from "./GitHubPanel";
import { MarketPanel } from "./MarketPanel";
import { JournalPanel } from "./JournalPanel";
import { Minimap } from "./Minimap";
import { ContributionGrid } from "./ContributionGrid";
import { AiUsagePanel } from "./AiUsagePanel";
import { SettingsPanel } from "./SettingsPanel";
import { DashboardPanel } from "./workspace/DashboardPanel";
import { NotesPanel } from "./workspace/NotesPanel";
import { CalendarPanel } from "./workspace/CalendarPanel";
import { TasksPanel } from "./workspace/TasksPanel";
import { MailPanel } from "./workspace/MailPanel";

export function Editor() {
  const openTabs = useEditor((s) => s.openTabs);
  const activeFile = useEditor((s) => s.activeFile);
  const fontSize = useEditor((s) => s.fontSize);
  const file = activeFile ? fileById(activeFile) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-vsc-bg">
      <Tabs />
      {file ? (
        <div className="relative flex min-h-0 flex-1">
          <div
            id="editor-scroll"
            className="min-h-0 flex-1 overflow-y-auto"
            style={{ zoom: fontSize / 14 }}
          >
          <Breadcrumb id={file.id} />
          <BlockRenderer blocks={file.blocks} />
          {file.id === "contact/contact.tsx" && (
            <div className="mx-auto max-w-3xl px-8 pb-12">
              <ContactForm />
            </div>
          )}
          {file.id === "live/contributions.tsx" && (
            <div className="mx-auto max-w-3xl px-8 pb-12">
              <ContributionGrid />
            </div>
          )}
          {file.id === "live/github.stats.tsx" && (
            <div className="mx-auto max-w-3xl px-8 pb-12">
              <GitHubPanel />
            </div>
          )}
          {file.id === "live/market.live.tsx" && (
            <div className="mx-auto max-w-3xl px-8 pb-12">
              <MarketPanel />
            </div>
          )}
          {file.id === "live/journal.tsx" && (
            <div className="pb-12">
              <JournalPanel />
            </div>
          )}
          {file.id === "meta/ai-usage.json" && (
            <div className="mx-auto max-w-3xl px-8 pb-12">
              <AiUsagePanel />
            </div>
          )}
          {file.id === ".vscode/settings.json" && (
            <div className="mx-auto max-w-3xl px-8 pb-12">
              <SettingsPanel />
            </div>
          )}
          {file.id === "workspace/dashboard.tsx" && <DashboardPanel />}
          {file.id === "workspace/notes.md" && <NotesPanel />}
          {file.id === "workspace/calendar.tsx" && <CalendarPanel />}
          {file.id === "workspace/tasks.todo" && <TasksPanel />}
          {file.id === "workspace/mail.tsx" && <MailPanel />}
          </div>
          <Minimap blocks={file.blocks} />
        </div>
      ) : (
        <Welcome />
      )}
    </div>
  );
}

function Tabs() {
  const openTabs = useEditor((s) => s.openTabs);
  const activeFile = useEditor((s) => s.activeFile);
  const setActive = useEditor((s) => s.setActive);
  const closeTab = useEditor((s) => s.closeTab);

  return (
    <div className="flex h-9 shrink-0 items-stretch overflow-x-auto overflow-y-hidden whitespace-nowrap bg-vsc-tabbar no-select">
      {openTabs.map((id) => {
        const f = fileById(id);
        if (!f) return null;
        const active = activeFile === id;
        return (
          <div
            key={id}
            onClick={() => setActive(id)}
            className={`group flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-r border-t-2 border-vsc-line px-3 text-[13px] ${
              active
                ? "border-t-vsc-accent bg-vsc-bg text-vsc-bright"
                : "border-t-transparent bg-vsc-tab-inactive text-vsc-muted hover:bg-vsc-bg/40"
            }`}
          >
            <FileIcon name={f.name} />
            <span>{f.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(id);
              }}
              className={`rounded p-0.5 hover:bg-white/10 ${
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Breadcrumb({ id }: { id: string }) {
  const parts = id.split("/");
  return (
    <div className="flex items-center justify-between px-8 py-1.5 text-[12px] text-vsc-muted no-select">
      <div className="flex items-center gap-1">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-vsc-line">›</span>}
            <span className={i === parts.length - 1 ? "text-vsc-text" : ""}>{p}</span>
          </span>
        ))}
      </div>
      <ShareButton id={id} />
    </div>
  );
}

function ShareButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const base = window.location.origin + window.location.pathname;
    const url = id && id !== DEFAULT_OPEN ? `${base}?file=${encodeURIComponent(id)}` : base;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked — ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      title="Скопировать прямую ссылку на этот файл"
      className="flex shrink-0 items-center gap-1.5 rounded px-2 py-0.5 text-[11px] hover:bg-vsc-hover hover:text-vsc-text"
    >
      {copied ? <Check size={12} className="text-vsc-green" /> : <Link2 size={12} />}
      {copied ? "Скопировано" : "Поделиться"}
    </button>
  );
}

function Welcome() {
  const setPalette = useEditor((s) => s.setPalette);
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center text-vsc-muted">
      <h1 className="text-4xl font-light text-vsc-text">Vladimir</h1>
      <p className="mt-2 text-sm">Fullstack Developer · portfolio</p>
      <button
        onClick={() => setPalette(true)}
        className="mt-6 flex items-center gap-2 rounded border border-vsc-line px-3 py-1.5 text-[13px] hover:bg-vsc-hover"
      >
        <Command size={14} /> Show All Commands
        <span className="ml-2 rounded bg-[#3c3c3c] px-1.5 py-0.5 text-[11px]">
          Ctrl+K
        </span>
      </button>
    </div>
  );
}
