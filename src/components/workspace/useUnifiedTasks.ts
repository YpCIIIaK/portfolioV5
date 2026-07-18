"use client";

import { useEffect, useMemo, useState } from "react";
import { getCached, setCached } from "@/lib/cache";
import { useSession } from "@/lib/session";
import { DEMO_TASKS, normalizeTask, type Priority, type Task, type TaskStatus } from "@/lib/workspace";
import { priorityRank } from "./wsStyle";
import { useCollection } from "./useCollection";

export type TaskSource = "workspace" | "bitrix" | "notion";

export interface UnifiedTask {
  id: string;
  sourceId: string;
  source: TaskSource;
  sourceLabel: string;
  title: string;
  status: TaskStatus;
  done: boolean;
  due: string | null;
  priority: Priority;
  createdAt: string | null;
  url: string | null;
  workspaceTask: Task | null;
  bitrixStatus: string | null;
}

interface BxTask {
  id: string;
  title: string;
  status: string;
  statusCode: number;
  deadline: string | null;
  createdDate?: string | null;
  groupName: string | null;
  url: string | null;
}

interface NtTask {
  id: string;
  title: string;
  done: boolean;
  due: string | null;
  priority: Priority;
  url: string | null;
  createdAt: string | null;
}

function bitrixStatusToTaskStatus(statusCode: number): TaskStatus {
  if (statusCode === 3 || statusCode === 4) return "doing";
  if (statusCode === 5) return "done";
  return "todo";
}

function dateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function bitrixPriority(deadline: string | null): Priority {
  if (!deadline) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateOnly(deadline) + "T00:00:00");
  if (Number.isNaN(due.getTime())) return "none";
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  return days <= 1 ? "high" : days <= 7 ? "medium" : "low";
}

function sortUnifiedTasks(a: UnifiedTask, b: UnifiedTask): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const pr = priorityRank(b.priority) - priorityRank(a.priority);
  if (pr !== 0) return pr;
  const due = (a.due ?? "9999").localeCompare(b.due ?? "9999");
  if (due !== 0) return due;
  return a.title.localeCompare(b.title, "ru");
}

function mapWorkspaceTask(task: Task): UnifiedTask {
  const t = normalizeTask(task);
  return {
    id: `workspace:${t.id}`,
    sourceId: t.id,
    source: "workspace",
    sourceLabel: "Workspace",
    title: t.title,
    status: t.status,
    done: t.done,
    due: t.due,
    priority: t.priority,
    createdAt: t.created_at,
    url: null,
    workspaceTask: t,
    bitrixStatus: null,
  };
}

function mapBitrixTask(task: BxTask): UnifiedTask {
  const status = bitrixStatusToTaskStatus(task.statusCode);
  const due = dateOnly(task.deadline);
  return {
    id: `bitrix:${task.id}`,
    sourceId: task.id,
    source: "bitrix",
    sourceLabel: "Bitrix24",
    title: task.title,
    status,
    done: status === "done",
    due,
    priority: bitrixPriority(due),
    createdAt: task.createdDate ?? null,
    url: task.url,
    workspaceTask: null,
    bitrixStatus: task.status,
  };
}

function mapNotionTask(task: NtTask): UnifiedTask {
  const status: TaskStatus = task.done ? "done" : "todo";
  return {
    id: `notion:${task.id}`,
    sourceId: task.id,
    source: "notion",
    sourceLabel: "Notion",
    title: task.title,
    status,
    done: task.done,
    due: task.due,
    priority: task.priority,
    createdAt: task.createdAt ?? null,
    url: task.url,
    workspaceTask: null,
    bitrixStatus: null,
  };
}

export function useUnifiedTasks() {
  const collection = useCollection<Task>("tasks", DEMO_TASKS);
  const owner = useSession((s) => !!s.user?.owner);
  const [bitrixTasks, setBitrixTasks] = useState<BxTask[]>(() => (owner ? getCached<BxTask[]>("bitrix:tasks") ?? [] : []));
  const [bitrixLoading, setBitrixLoading] = useState(() => owner && !getCached<BxTask[]>("bitrix:tasks"));
  const [bitrixError, setBitrixError] = useState("");
  const [notionTasks, setNotionTasks] = useState<NtTask[]>(() => (owner ? getCached<NtTask[]>("notion:tasks") ?? [] : []));
  const [notionLoading, setNotionLoading] = useState(() => owner && !getCached<NtTask[]>("notion:tasks"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!owner) {
        if (cancelled) return;
        setBitrixTasks([]);
        setBitrixLoading(false);
        setBitrixError("");
        return;
      }
      const cached = getCached<BxTask[]>("bitrix:tasks");
      if (cached) {
        if (cancelled) return;
        setBitrixTasks(cached);
        setBitrixLoading(false);
        return;
      }
      setBitrixLoading(true);
      try {
        const res = await fetch("/api/bitrix?scope=tasks");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        const items = (json.items as BxTask[]) ?? [];
        if (cancelled) return;
        setBitrixTasks(items);
        setCached("bitrix:tasks", items);
        setBitrixError("");
      } catch (e) {
        if (!cancelled) setBitrixError((e as Error).message);
      } finally {
        if (!cancelled) setBitrixLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!owner) {
        if (cancelled) return;
        setNotionTasks([]);
        setNotionLoading(false);
        return;
      }
      const cached = getCached<NtTask[]>("notion:tasks");
      if (cached) {
        if (cancelled) return;
        setNotionTasks(cached);
        setNotionLoading(false);
        return;
      }
      setNotionLoading(true);
      try {
        const res = await fetch("/api/notion?scope=tasks");
        const json = await res.json().catch(() => ({}));
        // Notion may be unconnected (502) — treat as simply "no tasks", not an error banner.
        const items = res.ok ? ((json.items as NtTask[]) ?? []) : [];
        if (cancelled) return;
        setNotionTasks(items);
        setCached("notion:tasks", items);
      } catch {
        if (!cancelled) setNotionTasks([]);
      } finally {
        if (!cancelled) setNotionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  const workspaceTasks = useMemo(() => collection.items.map(normalizeTask), [collection.items]);
  const unified = useMemo(
    () =>
      [
        ...workspaceTasks.map(mapWorkspaceTask),
        ...bitrixTasks.map(mapBitrixTask),
        ...notionTasks.map(mapNotionTask),
      ].sort(sortUnifiedTasks),
    [workspaceTasks, bitrixTasks, notionTasks],
  );

  return {
    ...collection,
    items: workspaceTasks,
    bitrixTasks,
    bitrixLoading,
    bitrixError,
    notionTasks,
    notionLoading,
    unified,
    unifiedOpen: unified.filter((task) => !task.done),
    loading: collection.loading || bitrixLoading || notionLoading,
  };
}
