"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Workflow as WorkflowIcon, Plus, Trash2, Play, ChevronUp, ChevronDown, History,
  Sparkles, Send, Mail, ListTodo, StickyNote, CalendarDays, Search, Globe, Brain, Type,
  CircleCheck, CircleX, RotateCcw, Power,
} from "lucide-react";
import { useCollection } from "./useCollection";
import { wsCreate, wsUpdate, wsDelete, DEMO_WORKFLOWS } from "@/lib/workspace";
import {
  STEP_CATALOG, STEP_META, stepLabel,
  type Workflow, type WorkflowData, type WorkflowStep, type WorkflowRun, type StepResult, type FieldDef,
} from "@/lib/workflow-steps";

/* ====================================================================== */
/*  Воркфлоу-билдер: список цепочек + конструктор блоков + запуск          */
/* ====================================================================== */

/** Иконки блоков — каталог хранит только имена, резолвим их здесь. */
const ICONS: Record<string, typeof Sparkles> = {
  Sparkles, Send, Mail, ListTodo, StickyNote, CalendarDays, Search, Globe, Brain, Type,
};

function StepIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Type;
  return <Icon size={size} />;
}

function uid(): string {
  return `s${Math.random().toString(36).slice(2, 9)}`;
}

export function WorkflowsPanel() {
  const { items, setItems, loading, readonly, reload } = useCollection<Workflow>("workflows", DEMO_WORKFLOWS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = items.find((w) => w.id === activeId) ?? items[0] ?? null;

  const createWorkflow = useCallback(async () => {
    if (readonly || busy) return;
    setBusy(true);
    try {
      const created = await wsCreate<Workflow>("workflows", {
        title: "Новый воркфлоу",
        description: "",
        enabled: true,
        data: { steps: [] },
      });
      setItems([created, ...items]);
      setActiveId(created.id);
    } catch {
      reload();
    } finally {
      setBusy(false);
    }
  }, [readonly, busy, items, setItems, reload]);

  const removeWorkflow = useCallback(async (id: string) => {
    if (readonly) return;
    const next = items.filter((w) => w.id !== id);
    setItems(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    try { await wsDelete("workflows", id); } catch { reload(); }
  }, [readonly, items, activeId, setItems, reload]);

  const persist = useCallback((id: string, patch: Partial<Workflow>) => {
    setItems(items.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    if (readonly) return;
    wsUpdate("workflows", id, patch as Record<string, unknown>).catch(() => {});
  }, [readonly, items, setItems]);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-3 px-4 py-4">
      <aside className="flex w-56 shrink-0 flex-col rounded-lg border border-vsc-line bg-vsc-sidebar">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-vsc-bright">
            <WorkflowIcon size={15} /> Воркфлоу
          </span>
          <button
            onClick={createWorkflow}
            disabled={readonly || busy}
            title="Новый воркфлоу"
            className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:opacity-40"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {loading ? (
            <p className="px-2 py-1 text-[12px] text-vsc-muted">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-2 text-[12px] leading-relaxed text-vsc-muted">
              Пусто. {readonly ? "Войди, чтобы собирать цепочки." : "Нажми + для новой цепочки."}
            </p>
          ) : (
            items.map((w) => (
              <div
                key={w.id}
                className={`group flex items-center gap-1 rounded px-2 py-1.5 ${active?.id === w.id ? "bg-vsc-hover" : "hover:bg-vsc-hover"}`}
              >
                <button onClick={() => setActiveId(w.id)} className="min-w-0 flex-1 text-left">
                  <span className={`block truncate text-[13px] ${w.enabled ? "text-vsc-text" : "text-vsc-muted line-through"}`}>
                    {w.title || "Без названия"}
                  </span>
                  <span className="block truncate text-[11px] text-vsc-muted">
                    {w.data.steps.map((s) => stepLabel(s.type)).join(" → ") || "нет блоков"}
                  </span>
                </button>
                {!readonly && (
                  <button
                    onClick={() => removeWorkflow(w.id)}
                    title="Удалить"
                    className="shrink-0 rounded p-0.5 text-vsc-muted opacity-0 hover:text-vsc-red group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {readonly && (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-vsc-muted">
            Демо-режим: цепочки не сохраняются и не запускаются.
          </p>
        )}
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {active ? (
          <WorkflowEditor
            key={active.id}
            workflow={active}
            readonly={readonly}
            onPatch={(patch) => persist(active.id, patch)}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-vsc-line text-[13px] text-vsc-muted">
            Выбери или создай воркфлоу
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Редактор одной цепочки                                                */
/* ====================================================================== */

function WorkflowEditor({
  workflow,
  readonly,
  onPatch,
}: {
  workflow: Workflow;
  readonly: boolean;
  onPatch: (patch: Partial<Workflow>) => void;
}) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; steps: StepResult[] } | null>(null);
  const [runError, setRunError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const steps = workflow.data.steps;

  const setSteps = useCallback((next: WorkflowStep[]) => {
    onPatch({ data: { steps: next } as WorkflowData });
  }, [onPatch]);

  const addStep = (type: string) => {
    setSteps([...steps, { id: uid(), type, params: {} }]);
  };

  const updateStep = (id: string, params: Record<string, string>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, params } : s)));
  };

  const removeStep = (id: string) => setSteps(steps.filter((s) => s.id !== id));

  const moveStep = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    [next[index], next[to]] = [next[to], next[index]];
    setSteps(next);
  };

  const run = async () => {
    if (readonly || running || !steps.length) return;
    setRunning(true);
    setRunError("");
    setResult(null);
    try {
      const res = await fetch("/api/workspace/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workflow.id, input }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult({ ok: json.ok, steps: json.steps ?? [] });
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  /** Откат к сохранённой сборке: текущая при этом сама уедет в историю. */
  const restore = (data: WorkflowData) => {
    if (readonly) return;
    onPatch({ data });
  };

  return (
    <div className="space-y-3">
      {/* шапка */}
      <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-3">
        <div className="flex items-center gap-2">
          <input
            value={workflow.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            disabled={readonly}
            placeholder="Название воркфлоу"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-vsc-bright outline-none placeholder:text-vsc-muted"
          />
          <button
            onClick={() => onPatch({ enabled: !workflow.enabled })}
            disabled={readonly}
            title={workflow.enabled ? "Выключить (ассистент не сможет запускать)" : "Включить"}
            className={`rounded p-1 hover:bg-vsc-hover disabled:opacity-40 ${workflow.enabled ? "text-vsc-green" : "text-vsc-muted"}`}
          >
            <Power size={15} />
          </button>
          <button
            onClick={() => setShowHistory((v) => !v)}
            title="История запусков и сборок"
            className={`rounded p-1 hover:bg-vsc-hover ${showHistory ? "text-vsc-accent" : "text-vsc-muted"}`}
          >
            <History size={15} />
          </button>
        </div>
        <input
          value={workflow.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          disabled={readonly}
          placeholder="Описание — что делает цепочка (видит и ассистент)"
          className="mt-1 w-full bg-transparent text-[12px] text-vsc-muted outline-none placeholder:text-vsc-muted"
        />
      </div>

      {/* цепочка */}
      <div className="space-y-2">
        {steps.length === 0 && (
          <p className="rounded-lg border border-dashed border-vsc-line px-3 py-6 text-center text-[13px] text-vsc-muted">
            Цепочка пуста — добавь первый блок снизу.
          </p>
        )}
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            total={steps.length}
            readonly={readonly}
            result={result?.steps.find((r) => r.id === step.id) ?? null}
            onChange={(params) => updateStep(step.id, params)}
            onMove={(d) => moveStep(i, d)}
            onRemove={() => removeStep(step.id)}
          />
        ))}
      </div>

      {/* палитра блоков */}
      {!readonly && (
        <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">Добавить блок</p>
          <div className="flex flex-wrap gap-1.5">
            {STEP_CATALOG.map((meta) => (
              <button
                key={meta.type}
                onClick={() => addStep(meta.type)}
                title={meta.hint}
                className="flex items-center gap-1.5 rounded border border-vsc-line px-2 py-1 text-[12px] text-vsc-text hover:bg-vsc-hover hover:text-vsc-bright"
              >
                <StepIcon name={meta.icon} size={13} />
                {meta.label}
                {meta.writes && <span title="Меняет данные / шлёт наружу" className="h-1.5 w-1.5 rounded-full bg-vsc-yellow" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-vsc-muted">
            В полях доступны подстановки: <code>{"{{input}}"}</code> — текст запуска, <code>{"{{prev}}"}</code> — результат
            предыдущего блока, <code>{"{{date}}"}</code> — сегодняшняя дата.
          </p>
        </div>
      )}

      {/* запуск */}
      <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">Запуск</p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={readonly}
          rows={2}
          placeholder="Входной текст — подставится как {{input}} (можно пусто)"
          className="w-full resize-y rounded border border-vsc-line bg-vsc-bg px-2 py-1.5 text-[13px] text-vsc-text outline-none placeholder:text-vsc-muted focus:border-vsc-accent"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={run}
            disabled={readonly || running || !steps.length}
            className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90 disabled:opacity-40"
          >
            <Play size={14} /> {running ? "Выполняю…" : "Запустить"}
          </button>
          {result && (
            <span className={`flex items-center gap-1 text-[12px] ${result.ok ? "text-vsc-green" : "text-vsc-red"}`}>
              {result.ok ? <CircleCheck size={13} /> : <CircleX size={13} />}
              {result.ok ? "Цепочка выполнена" : "Остановлено на ошибке"}
            </span>
          )}
          {runError && <span className="text-[12px] text-vsc-red">{runError}</span>}
        </div>
      </div>

      {showHistory && (
        <HistorySection workflow={workflow} readonly={readonly} onRestore={restore} />
      )}
    </div>
  );
}

/* ---- карточка блока --------------------------------------------------- */

function StepCard({
  step,
  index,
  total,
  readonly,
  result,
  onChange,
  onMove,
  onRemove,
}: {
  step: WorkflowStep;
  index: number;
  total: number;
  readonly: boolean;
  result: StepResult | null;
  onChange: (params: Record<string, string>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const meta = STEP_META.get(step.type);
  const set = (key: string, value: string) => onChange({ ...step.params, [key]: value });

  return (
    <div className="rounded-lg border border-vsc-line bg-vsc-sidebar">
      <div className="flex items-center gap-2 border-b border-vsc-line px-3 py-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vsc-hover text-[11px] text-vsc-muted">
          {index + 1}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-vsc-bright">
          <StepIcon name={meta?.icon ?? "Type"} />
          {meta?.label ?? step.type}
        </span>
        {result && (
          <span className={`flex items-center gap-1 text-[11px] ${result.ok ? "text-vsc-green" : "text-vsc-red"}`}>
            {result.ok ? <CircleCheck size={12} /> : <CircleX size={12} />}
            {result.ms}мс
          </span>
        )}
        {!readonly && (
          <div className="ml-auto flex items-center gap-0.5">
            <button onClick={() => onMove(-1)} disabled={index === 0} title="Выше" className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:opacity-30"><ChevronUp size={13} /></button>
            <button onClick={() => onMove(1)} disabled={index === total - 1} title="Ниже" className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:opacity-30"><ChevronDown size={13} /></button>
            <button onClick={onRemove} title="Удалить блок" className="rounded p-1 text-vsc-muted hover:text-vsc-red"><Trash2 size={13} /></button>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        {meta?.fields.length === 0 && (
          <p className="text-[12px] text-vsc-muted">{meta.hint} Настраивать нечего.</p>
        )}
        {meta?.fields.map((field) => (
          <Field key={field.key} field={field} value={step.params[field.key] ?? ""} readonly={readonly} onChange={(v) => set(field.key, v)} />
        ))}

        {result && (
          <div className={`rounded border px-2 py-1.5 text-[12px] ${result.ok ? "border-vsc-line text-vsc-muted" : "border-vsc-red/40 text-vsc-red"}`}>
            <span className="whitespace-pre-wrap break-words">{result.output.slice(0, 1500)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  readonly,
  onChange,
}: {
  field: FieldDef;
  value: string;
  readonly: boolean;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full rounded border border-vsc-line bg-vsc-bg px-2 py-1.5 text-[13px] text-vsc-text outline-none placeholder:text-vsc-muted focus:border-vsc-accent disabled:opacity-60";

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-vsc-muted">
        {field.label}
        {field.required && <span className="text-vsc-red"> *</span>}
      </span>
      {field.type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={readonly} rows={3} placeholder={field.placeholder} className={`${base} resize-y font-mono`} />
      ) : field.type === "select" ? (
        <select value={value || field.options?.[0]?.value || ""} onChange={(e) => onChange(e.target.value)} disabled={readonly} className={base}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} disabled={readonly} placeholder={field.placeholder} className={base} />
      )}
    </label>
  );
}

/* ---- история: прошлые запуски и прошлые сборки ------------------------ */

function HistorySection({
  workflow,
  readonly,
  onRestore,
}: {
  workflow: Workflow;
  readonly: boolean;
  onRestore: (data: WorkflowData) => void;
}) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workspace/workflows/runs?workflow_id=${encodeURIComponent(workflow.id)}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setRuns(json.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workflow.id]);

  const versions = useMemo(() => workflow.versions ?? [], [workflow.versions]);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">Запуски</p>
        {loading ? (
          <p className="text-[12px] text-vsc-muted">Загрузка…</p>
        ) : runs.length === 0 ? (
          <p className="text-[12px] text-vsc-muted">Запусков пока не было.</p>
        ) : (
          <div className="space-y-1.5">
            {runs.map((r) => (
              <div key={r.id} className="flex items-start gap-2 rounded px-1.5 py-1 hover:bg-vsc-hover">
                {r.ok ? <CircleCheck size={13} className="mt-0.5 shrink-0 text-vsc-green" /> : <CircleX size={13} className="mt-0.5 shrink-0 text-vsc-red" />}
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-vsc-text">{new Date(r.created_at).toLocaleString("ru-RU")}</div>
                  <div className="truncate text-[11px] text-vsc-muted">{r.output.replace(/\s+/g, " ") || "(без вывода)"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">
          Прошлые сборки ({versions.length})
        </p>
        {versions.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-vsc-muted">
            Пока одна версия. Каждое изменение цепочки сохраняет предыдущую сюда — ничего не теряется.
          </p>
        ) : (
          <div className="space-y-1.5">
            {versions.map((v, i) => (
              <div key={`${v.at}-${i}`} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-vsc-hover">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-vsc-text">{new Date(v.at).toLocaleString("ru-RU")}</div>
                  <div className="truncate text-[11px] text-vsc-muted">
                    {v.data.steps.map((s) => stepLabel(s.type)).join(" → ") || "нет блоков"}
                  </div>
                </div>
                <button
                  onClick={() => onRestore(v.data)}
                  disabled={readonly}
                  title="Вернуть эту сборку"
                  className="shrink-0 rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-accent disabled:opacity-40"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
