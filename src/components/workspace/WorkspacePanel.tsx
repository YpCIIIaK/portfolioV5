"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LogIn, CircleUser, LogOut, LayoutDashboard, StickyNote, CalendarDays, ListTodo, Mail, FolderGit2, Blocks, Briefcase, Send, CreditCard, Sparkles, Newspaper, Music, BookText, Shapes, HeartPulse, Frame, Brain, Workflow, HardDrive, Cpu, ChevronRight, ChevronDown } from "lucide-react";
import { useSession } from "@/lib/session";
import { useEditor } from "@/lib/store";

type Item = { id: string; label: string; Icon: typeof LayoutDashboard };

const GROUPS: { key: string; title: string; items: Item[] }[] = [
  {
    key: "main",
    title: "Обзор",
    items: [
      { id: "workspace/dashboard.tsx", label: "Главная", Icon: LayoutDashboard },
      { id: "workspace/assistant.tsx", label: "Ассистент", Icon: Sparkles },
      { id: "workspace/brain.tsx", label: "Второй мозг", Icon: Brain },
      { id: "workspace/workflows.tsx", label: "Воркфлоу", Icon: Workflow },
    ],
  },
  {
    key: "productivity",
    title: "Продуктивность",
    items: [
      { id: "workspace/notes.md", label: "Заметки", Icon: StickyNote },
      { id: "workspace/tasks.todo", label: "Задачи", Icon: ListTodo },
      { id: "workspace/calendar.tsx", label: "Календарь", Icon: CalendarDays },
      { id: "workspace/diagrams.tsx", label: "Диаграммы", Icon: Shapes },
      { id: "workspace/projects.tsx", label: "Проекты", Icon: FolderGit2 },
    ],
  },
  {
    key: "integrations",
    title: "Интеграции",
    items: [
      { id: "workspace/mail.tsx", label: "Почта", Icon: Mail },
      { id: "workspace/telegram.tsx", label: "Telegram", Icon: Send },
      { id: "workspace/notion.tsx", label: "Notion", Icon: BookText },
      { id: "workspace/drive.tsx", label: "Google Drive", Icon: HardDrive },
      { id: "workspace/bitrix.tsx", label: "Bitrix24", Icon: Briefcase },
      { id: "workspace/models.tsx", label: "Модели ИИ", Icon: Cpu },
      { id: "workspace/subscriptions.tsx", label: "Подписки", Icon: CreditCard },
    ],
  },
  {
    key: "media",
    title: "Медиа",
    items: [
      { id: "workspace/news.tsx", label: "Новости", Icon: Newspaper },
      { id: "workspace/music.tsx", label: "Музыка", Icon: Music },
    ],
  },
  {
    key: "tools",
    title: "Инструменты",
    items: [
      { id: "tools/repo-health.tsx", label: "Repo Health", Icon: HeartPulse },
      { id: "tools/figma.tsx", label: "Figma → Code", Icon: Frame },
    ],
  },
];

const COLLAPSE_KEY = "ws-sidebar-collapsed";

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function WorkspacePanel() {
  const { user, configured, loaded, refresh, logout } = useSession();
  const openFile = useEditor((s) => s.openFile);
  const activeFile = useEditor((s) => s.activeFile);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loaded) refresh();
  }, [loaded, refresh]);

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">
        Workspace
      </div>

      {/* account */}
      <div className="border-b border-vsc-line px-3 pb-3">
        {user ? (
          <div className="flex items-center gap-2">
            {user.avatar ? (
              <Image src={user.avatar} alt="" width={28} height={28} className="rounded-full" />
            ) : (
              <CircleUser size={20} className="text-vsc-text" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-vsc-bright">{user.name}</div>
              <div className="truncate text-[11px] text-vsc-muted">
                {user.owner ? "Владелец · полный доступ" : "Гость"}
              </div>
            </div>
            <button onClick={logout} title="Выйти" className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text">
              <LogOut size={15} />
            </button>
          </div>
        ) : configured ? (
          <a
            href="/api/auth/login"
            className="flex items-center justify-center gap-2 rounded bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90"
          >
            <LogIn size={16} /> Войти через GitHub
          </a>
        ) : (
          <p className="text-[12px] leading-relaxed text-vsc-muted">
            <Blocks size={14} className="mr-1 inline" />
            Личный кабинет. Вход через GitHub станет доступен после настройки OAuth владельцем. Пока — демо-режим.
          </p>
        )}
      </div>

      {/* feature launcher */}
      <div className="px-2 py-1">
        {GROUPS.map(({ key, title, items }) => {
          const isCollapsed = !!collapsed[key];
          const hasActive = items.some((i) => i.id === activeFile);
          return (
            <div key={key} className="mb-0.5">
              <button
                onClick={() => toggleGroup(key)}
                className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[11px] font-medium uppercase tracking-wide text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                {title}
                {isCollapsed && hasActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-vsc-accent" />
                )}
              </button>
              {!isCollapsed &&
                items.map(({ id, label, Icon }) => {
                  const active = id === activeFile;
                  return (
                    <button
                      key={id}
                      onClick={() => openFile(id)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 pl-6 text-left text-[13px] ${
                        active
                          ? "bg-vsc-hover text-vsc-bright"
                          : "text-vsc-text hover:bg-vsc-hover"
                      }`}
                    >
                      <Icon size={15} className={active ? "text-vsc-accent" : "text-vsc-muted"} /> {label}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>

      <p className="mt-auto px-4 py-3 text-[11px] leading-relaxed text-vsc-muted">
        {user?.owner
          ? "Данные синхронизируются с твоей БД (Supabase)."
          : "Гости видят демо-данные только для просмотра."}
      </p>
    </div>
  );
}
