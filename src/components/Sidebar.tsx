"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, GitBranch, Search } from "lucide-react";
import { tree, allFiles, GITHUB } from "@/lib/files";
import { isFolder, type TreeNode } from "@/lib/types";
import { useEditor } from "@/lib/store";
import { FileIcon } from "./FileIcon";
import { WorkspacePanel } from "./workspace/WorkspacePanel";

export function Sidebar() {
  const view = useEditor((s) => s.activityView);
  return (
    <div data-tour="sidebar" className="flex h-full w-60 shrink-0 flex-col bg-vsc-sidebar no-select">
      {view === "explorer" && <ExplorerView />}
      {view === "search" && <SearchView />}
      {view === "git" && <GitView />}
      {view === "extensions" && <WorkspacePanel />}
      {view === "run" && <PanelStub title="Run and Debug" text="▶ Запусти терминал внизу (Ctrl+`) и набери `help`." />}
    </div>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">
      {children}
    </div>
  );
}

/* ----------------------------  EXPLORER  ---------------------------- */

function ExplorerView() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PanelHeader>Explorer</PanelHeader>
      <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-vsc-text">
        <ChevronDown size={14} /> Portfolio
      </div>
      <div className="pb-4">
        {tree.children.map((node) => (
          <TreeItem key={node.id} node={node} depth={1} />
        ))}
      </div>
    </div>
  );
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const activeFile = useEditor((s) => s.activeFile);
  const openFile = useEditor((s) => s.openFile);
  const pad = { paddingLeft: depth * 12 + 4 };

  if (isFolder(node)) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={pad}
          data-tour={node.id === "live" ? "live" : undefined}
          className="flex w-full items-center gap-1 py-[3px] pr-2 text-[13px] text-vsc-text hover:bg-vsc-hover"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>{node.name}</span>
        </button>
        {open &&
          node.children.map((c) => (
            <TreeItem key={c.id} node={c} depth={depth + 1} />
          ))}
      </div>
    );
  }

  const active = activeFile === node.id;
  return (
    <button
      onClick={() => openFile(node.id)}
      style={pad}
      className={`flex w-full items-center gap-1.5 py-[3px] pr-2 text-[13px] hover:bg-vsc-hover ${
        active ? "bg-vsc-active-row text-vsc-bright" : "text-vsc-text"
      }`}
    >
      <span className="ml-3.5 flex items-center">
        <FileIcon name={node.name} />
      </span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

/* ----------------------------  SEARCH  ---------------------------- */

function SearchView() {
  const [q, setQ] = useState("");
  const openFile = useEditor((s) => s.openFile);
  const results = q
    ? allFiles.filter(
        (f) =>
          f.name.toLowerCase().includes(q.toLowerCase()) ||
          JSON.stringify(f.blocks).toLowerCase().includes(q.toLowerCase())
      )
    : [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PanelHeader>Search</PanelHeader>
      <div className="px-3">
        <div className="flex items-center gap-1.5 rounded border border-vsc-line bg-[#3c3c3c] px-2 py-1">
          <Search size={13} className="text-vsc-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[13px] text-vsc-text outline-none placeholder:text-vsc-muted"
          />
        </div>
      </div>
      <div className="mt-2">
        {results.map((f) => (
          <button
            key={f.id}
            onClick={() => openFile(f.id)}
            className="flex w-full items-center gap-1.5 px-3 py-1 text-[13px] text-vsc-text hover:bg-vsc-hover"
          >
            <FileIcon name={f.name} />
            <span className="truncate">{f.id}</span>
          </button>
        ))}
        {q && results.length === 0 && (
          <p className="px-3 py-2 text-[12px] text-vsc-muted">No results.</p>
        )}
      </div>
    </div>
  );
}

/* ----------------------------  GIT  ---------------------------- */

function GitView() {
  const commits = [
    "feat: multi-agent arena — visual chain builder",
    "perf: instant per-process CPU via cumulative-time delta",
    "feat: backfill totalExperience for 227k docs",
    "feat: fan-out snapshots to N clients from one poll-loop",
    "test: 237 unit tests for repo-anti-rot engine",
  ];
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PanelHeader>Source Control</PanelHeader>
      <div className="flex items-center gap-1.5 px-4 py-1 text-[12px] text-vsc-text">
        <GitBranch size={14} /> main
      </div>
      <div className="mt-2 px-3 text-[11px] uppercase tracking-wide text-vsc-muted">
        Recent commits
      </div>
      <div className="mt-1">
        {commits.map((c, i) => (
          <div key={i} className="px-4 py-1 text-[12px] text-vsc-text">
            <span className="font-mono text-vsc-yellow">
              {(7654321 + i * 137).toString(16).slice(0, 7)}
            </span>{" "}
            {c}
          </div>
        ))}
      </div>
      <a
        href={GITHUB}
        target="_blank"
        rel="noreferrer"
        className="mx-3 mt-3 rounded bg-vsc-accent px-3 py-1.5 text-center text-[12px] text-white hover:opacity-90"
      >
        Open full history on GitHub
      </a>
    </div>
  );
}

function PanelStub({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader>{title}</PanelHeader>
      <p className="px-4 py-2 text-[12.5px] leading-relaxed text-vsc-muted">
        {text}
      </p>
    </div>
  );
}
