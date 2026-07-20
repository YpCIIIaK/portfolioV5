"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cpu, Loader2, Search, Wrench, X } from "lucide-react";

/**
 * Выбор модели OpenRouter под каждую задачу.
 *
 * Модель раньше была одна на всё (OPENROUTER_MODEL), но требования у задач
 * разные: мозгу нужен большой контекст, чату — скорость, воркфлоу — дешевизна.
 * Здесь «по умолчанию» задаёт общую модель, а любая задача может взять свою.
 */

interface TaskDef {
  id: string;
  label: string;
  hint: string;
}

interface CatalogModel {
  id: string;
  name: string;
  context: number;
  promptPrice: number;
  completionPrice: number;
  tools: boolean;
}

function price(p: number): string {
  if (!p) return "бесплатно";
  return p < 1 ? `$${p.toFixed(2)}/M` : `$${p.toFixed(1)}/M`;
}

function ctx(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n || 0);
}

export function ModelsPanel() {
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [env, setEnv] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [picking, setPicking] = useState<string | null>(null);

  // Загрузка живёт прямо в эффекте: setState после await, иначе линтер ругается
  // на синхронный setState в теле эффекта (как в ModelPicker ниже).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/workspace/models");
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setTasks(json.tasks ?? []);
        setMap(json.map ?? {});
        setEnv(json.env ?? "");
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const save = useCallback(async (task: string, model: string) => {
    setSaving(task); setError("");
    try {
      const res = await fetch("/api/workspace/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, model }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMap(json.map ?? {});
      setPicking(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving("");
    }
  }, []);

  return (
    <div className="h-full overflow-auto p-4 text-sm text-vsc-text">
      <div className="mb-4 flex items-center gap-2">
        <Cpu size={16} className="text-vsc-accent" />
        <h2 className="font-semibold">Модели OpenRouter</h2>
        {loading && <Loader2 size={14} className="animate-spin text-vsc-muted" />}
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <p className="mb-4 text-xs text-vsc-muted">
        «По умолчанию» действует везде, где у задачи не выбрана своя модель.
        Если и там пусто — берётся <code>OPENROUTER_MODEL</code> из окружения
        {env && <> (сейчас <code>{env}</code>)</>}.
      </p>

      <div className="space-y-2">
        {tasks.map((t) => {
          const own = map[t.id] || "";
          const effective = own || map.default || env;
          return (
            <div key={t.id} className="rounded border border-vsc-border bg-vsc-panel px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-vsc-muted">{t.hint}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {saving === t.id && <Loader2 size={13} className="animate-spin text-vsc-muted" />}
                  <button
                    onClick={() => setPicking(t.id)}
                    className="rounded border border-vsc-border px-2 py-1 text-xs hover:bg-vsc-hover"
                  >
                    Выбрать
                  </button>
                  {own && t.id !== "default" && (
                    <button
                      onClick={() => void save(t.id, "")}
                      title="Вернуть к общей модели"
                      className="rounded border border-vsc-border px-2 py-1 text-xs text-vsc-muted hover:bg-vsc-hover"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1 truncate font-mono text-xs">
                {own ? (
                  <span className="text-vsc-accent">{own}</span>
                ) : (
                  <span className="text-vsc-muted">наследует: {effective || "—"}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {picking && (
        <ModelPicker
          task={tasks.find((t) => t.id === picking)?.label ?? picking}
          current={map[picking] || ""}
          onPick={(id) => void save(picking, id)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

/** Каталог с поиском. Список у OpenRouter под три сотни моделей — без фильтра нежизнеспособен. */
function ModelPicker({
  task, current, onPick, onClose,
}: {
  task: string;
  current: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [all, setAll] = useState<CatalogModel[]>([]);
  const [q, setQ] = useState("");
  const [toolsOnly, setToolsOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/workspace/models?catalog=1");
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setAll(json.models ?? []);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((m) => (!toolsOnly || m.tools) && (!freeOnly || !m.promptPrice))
      .filter((m) => !needle || m.id.toLowerCase().includes(needle) || m.name.toLowerCase().includes(needle))
      .slice(0, 200);
  }, [all, q, toolsOnly, freeOnly]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded border border-vsc-border bg-vsc-bg">
        <div className="flex items-center justify-between border-b border-vsc-border px-3 py-2">
          <span className="text-sm font-medium">Модель для: {task}</span>
          <button onClick={onClose} className="text-vsc-muted hover:text-vsc-text"><X size={16} /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-vsc-border px-3 py-2">
          <div className="flex flex-1 items-center gap-2 rounded border border-vsc-border px-2">
            <Search size={13} className="text-vsc-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="claude, gemini, qwen…"
              className="w-full bg-transparent py-1 text-xs outline-none"
            />
          </div>
          <label className="flex items-center gap-1 text-xs text-vsc-muted">
            <input type="checkbox" checked={toolsOnly} onChange={(e) => setToolsOnly(e.target.checked)} />
            с инструментами
          </label>
          <label className="flex items-center gap-1 text-xs text-vsc-muted">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
            бесплатные
          </label>
        </div>

        <div className="flex-1 overflow-auto">
          {loading && <div className="p-4 text-xs text-vsc-muted">Загружаю каталог…</div>}
          {error && <div className="p-4 text-xs text-red-300">{error}</div>}
          {shown.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className={`flex w-full items-center justify-between gap-3 border-b border-vsc-border px-3 py-2 text-left hover:bg-vsc-hover ${
                m.id === current ? "bg-vsc-accent/10" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{m.name}</div>
                <div className="truncate font-mono text-[10px] text-vsc-muted">{m.id}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[10px] text-vsc-muted">
                {m.tools && <span title="умеет вызывать инструменты"><Wrench size={11} /></span>}
                <span>{ctx(m.context)}</span>
                <span className={m.promptPrice ? "" : "text-emerald-400"}>{price(m.promptPrice)}</span>
              </div>
            </button>
          ))}
          {!loading && !error && !shown.length && (
            <div className="p-4 text-xs text-vsc-muted">Ничего не найдено.</div>
          )}
        </div>
      </div>
    </div>
  );
}
