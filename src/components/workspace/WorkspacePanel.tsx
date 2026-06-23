"use client";

import { useEffect } from "react";
import Image from "next/image";
import { LogIn, CircleUser, LogOut, LayoutDashboard, StickyNote, CalendarDays, ListTodo, Mail, Blocks } from "lucide-react";
import { useSession } from "@/lib/session";
import { useEditor } from "@/lib/store";

const FEATURES = [
  { id: "workspace/dashboard.tsx", label: "Главная", Icon: LayoutDashboard },
  { id: "workspace/notes.md", label: "Заметки", Icon: StickyNote },
  { id: "workspace/calendar.tsx", label: "Календарь", Icon: CalendarDays },
  { id: "workspace/tasks.todo", label: "Задачи", Icon: ListTodo },
  { id: "workspace/mail.tsx", label: "Почта", Icon: Mail },
];

export function WorkspacePanel() {
  const { user, configured, loaded, refresh, logout } = useSession();
  const openFile = useEditor((s) => s.openFile);

  useEffect(() => {
    if (!loaded) refresh();
  }, [loaded, refresh]);

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
      <div className="px-2 py-2">
        {FEATURES.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => openFile(id)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-vsc-text hover:bg-vsc-hover"
          >
            <Icon size={15} className="text-vsc-muted" /> {label}
          </button>
        ))}
      </div>

      <p className="mt-auto px-4 py-3 text-[11px] leading-relaxed text-vsc-muted">
        {user?.owner
          ? "Данные синхронизируются с твоей БД (Supabase)."
          : "Гости видят демо-данные только для просмотра."}
      </p>
    </div>
  );
}
