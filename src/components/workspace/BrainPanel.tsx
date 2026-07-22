"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Sparkles, Plus, Save, Trash2, ExternalLink, Link2, X, Loader2, Search, ChevronDown, ChevronRight, Eraser, Ban, FileText, Layers } from "lucide-react";
import { BRAIN_MODES, BRAIN_MODE_LABEL, BRAIN_MODE_HINT, brainMode, type BrainMode } from "@/lib/brain-modes";
import { useSession } from "@/lib/session";
import { useEditor } from "@/lib/store";
import {
  wsList, wsCreate, wsUpdate, wsDelete,
  DEMO_BRAIN,
  type BrainState, type BrainNode, type BrainSnapshot,
} from "@/lib/workspace";
import { GuestBanner } from "./GuestBanner";
import {
  CATEGORIES, catColor, catLabel, computeWeights, withCategoryHubs,
  NOISE, SOURCE_FILE, type CleanPlan,
} from "./brain/model";
import { useBrainCanvas } from "./brain/useBrainCanvas";
import { SourcePicker } from "./brain/SourcePicker";

/**
 * «Второй мозг» — граф знаний, собранный ИИ из всего воркспейса (задачи,
 * заметки, календарь, почта, Telegram, Notion, …). Плавающие точки-узлы с
 * категорией/важностью и связями; каждый узел помнит источник. Граф можно
 * править руками, пересобирать ИИ и сохранять снапшоты состояния (ws_brain).
 *
 * Панель — оркестратор: состояние, снапшоты и вызовы API живут здесь;
 * физика/отрисовка холста — в ./brain/useBrainCanvas, чистая логика графа
 * (веса, категории, центры) — в ./brain/model.
 */
export function BrainPanel() {
  const owner = useSession((s) => !!s.user?.owner);
  const openFile = useEditor((s) => s.openFile);

  const [graph, setGraph] = useState<BrainState>(DEMO_BRAIN);
  const [demo, setDemo] = useState(true);
  const [snapshots, setSnapshots] = useState<BrainSnapshot[]>([]);
  const [snapshotId, setSnapshotId] = useState<string>(""); // текущий загруженный снапшот
  const [title, setTitle] = useState("Мой мозг");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "generate" | "augment" | "save" | "clean" | "sweep">("");
  // Полный обход: прогресс и флаг остановки. Обход длинный (десятки итераций),
  // поэтому его должно быть видно и его должно быть можно прервать.
  const [sweep, setSweep] = useState<{
    iteration: number; iterations: number; added: number; edges: number;
    batch: string[]; labels: string[]; note: string;
  } | null>(null);
  const sweepStop = useRef(false);
  // План чистки: показываем, что удалится, ДО удаления — снапшот один и отката нет.
  const [cleanPlan, setCleanPlan] = useState<CleanPlan | null>(null);
  // Чёрный список тем: чистить постфактум мало, надо чтобы не появлялось заново.
  const [blockRules, setBlockRules] = useState<{ id: string; pattern: string }[]>([]);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockInput, setBlockInput] = useState("");
  // Точечное дополнение: модалка выбора конкретных файлов Диска.
  const [filePicker, setFilePicker] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  // Список привязки в карточке узла: открыт/закрыт + строка фильтра.
  const [linkPicker, setLinkPicker] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  // Что добавил последний «Дополнить». Сворачиваемо: при 30 узлах список
  // занял бы пол-экрана, но и прятать его целиком нельзя — иначе непонятно,
  // что именно приросло.
  const [addedLabels, setAddedLabels] = useState<string[]>([]);
  const [addedOpen, setAddedOpen] = useState(true);
  // Свобода сборки: сколько узлов тянуть и насколько терпеть мелочи.
  // Запоминаем между сессиями — это настройка, а не разовый выбор.
  const [mode, setModeState] = useState<BrainMode>("balanced");
  useEffect(() => {
    // Через микротаску: localStorage недоступен при SSR, а синхронный setState
    // в теле эффекта даёт каскадный рендер (тот же приём, что в других панелях).
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const saved = brainMode(localStorage.getItem("brain:mode"));
      // «total» мог осесть в localStorage, пока он ошибочно висел в выпадашке:
      // теперь его там нет, и такой режим оставил бы селектор пустым, а обычную
      // сборку — с настройками, рассчитанными на пачку файлов, а не на всё сразу.
      setModeState(saved === "total" ? "free" : saved);
    })();
    return () => { cancelled = true; };
  }, []);
  const setMode = (m: BrainMode) => {
    setModeState(m);
    localStorage.setItem("brain:mode", m);
  };

  // Миникарта: на большом графе легко уехать в пустоту и потерять, где вообще
  // находишься. Здесь видно всю карту сразу и рамку текущего вида.
  const [miniOn, setMiniOn] = useState(true);

  // Рисуем и считаем физику по графу С достроенными центрами категорий;
  // сохраняется и редактируется при этом `graph` — центры туда не просачиваются.
  const viewGraph = useMemo(() => withCategoryHubs(graph), [graph]);
  // Веса пересчитываем только при смене графа — в кадре анимации это дорого.
  const weights = useMemo(() => computeWeights(viewGraph.nodes, viewGraph.edges), [viewGraph]);
  // Число соседей — показываем его в списке привязки, чтобы было видно,
  // почему узел стоит выше: вес складывается из важности и связности.
  const degrees = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of graph.edges) {
      d.set(e.from, (d.get(e.from) ?? 0) + 1);
      d.set(e.to, (d.get(e.to) ?? 0) + 1);
    }
    return d;
  }, [graph.edges]);

  // Поиск: узлы, попавшие под запрос (по названию, сути, категории). null = поиск неактивен.
  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return graph.nodes.filter(
      (n) => n.label.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.category.toLowerCase().includes(q),
    );
  }, [search, graph]);
  const matchedIds = useMemo(() => (matched ? new Set(matched.map((n) => n.id)) : null), [matched]);

  /** Связать два узла. Дубликат (в любую сторону) молча игнорируем. */
  const addEdge = useCallback((from: string, to: string) => {
    if (from === to) return;
    setGraph((g) => ({
      ...g,
      edges: g.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))
        ? g.edges
        : [...g.edges, { id: `e${Date.now()}`, from, to }],
    }));
    setDirty(true);
  }, []);

  const { canvasRef, wrapRef, miniRef, canvasHandlers, miniGo, focusNode, positions, resetBodies } = useBrainCanvas({
    graph: viewGraph,
    weights,
    selectedId,
    linkFrom,
    matchedIds,
    onSelect: useCallback((id: string | null) => {
      setSelectedId(id);
      if (!id) setLinkFrom(null);
    }, []),
    onLink: useCallback((from: string, to: string) => {
      addEdge(from, to);
      setLinkFrom(null);
    }, [addEdge]),
  });

  /* ---- загрузка ------------------------------------------------------- */

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await wsList<BrainSnapshot>("brain");
        if (!alive) return;
        setSnapshots(rows);
        setDemo(false);
        if (rows.length) {
          setGraph(rows[0].data);
          setSnapshotId(rows[0].id);
          setTitle(rows[0].title);
        } else {
          setGraph({ nodes: [], edges: [] });
        }
      } catch {
        if (alive) { setGraph(DEMO_BRAIN); setDemo(true); }
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ---- действия -------------------------------------------------------- */

  /** Инкремент: сервер дополняет ПОСЛЕДНИЙ снапшот только новым из источников. */
  const loadBlocklist = async () => {
    try {
      const res = await fetch("/api/workspace/brain/blocklist");
      const json = await res.json();
      if (res.ok) setBlockRules(json.rules ?? []);
    } catch { /* список не критичен для работы панели */ }
  };

  const addBlockRule = async () => {
    const pattern = blockInput.trim();
    if (pattern.length < 2) return;
    setError("");
    try {
      const res = await fetch("/api/workspace/brain/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setBlockRules(json.rules ?? []);
      setBlockInput("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeBlockRule = async (id: string) => {
    try {
      const res = await fetch(`/api/workspace/brain/blocklist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) setBlockRules(json.rules ?? []);
    } catch { /* молча: удаление правила — не критичная операция */ }
  };

  /** Шаг 1: спросить сервер, что он считает мусором. Ничего не меняет. */
  const previewClean = async () => {
    setBusy("clean"); setError(""); setInfo(""); setCleanPlan(null);
    try {
      const res = await fetch("/api/workspace/brain/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (!json.nodes?.length && !json.edges) { setInfo("Мусора не нашлось — граф чистый."); return; }
      setCleanPlan(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  /** Шаг 2: применить показанный план. */
  const applyClean = async (dropLonely: boolean) => {
    setBusy("clean"); setError("");
    try {
      const res = await fetch("/api/workspace/brain/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true, dropLonely }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (json.data) {
        setGraph(json.data);
        setSelectedId(null);
        setDirty(false);
        setSnapshots((s) => s.map((x) => (x.id === json.id ? { ...x, data: json.data, updated_at: new Date().toISOString() } : x)));
      }
      setInfo(`Удалено: ${json.nodes?.length ?? 0} узл., ${json.edges ?? 0} связ. Осталось ${json.keptNodes} узл.`);
      setCleanPlan(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const augment = async (fileIds: string[] = [], projectIds: string[] = []) => {
    setBusy("augment"); setError(""); setInfo(""); setAddedLabels([]);
    try {
      const res = await fetch("/api/workspace/brain/augment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, fileIds, projectIds }),
      });
      const text = await res.text();
      let json: { data?: BrainState; id?: string; added?: number; edges?: number; labels?: string[]; sources?: string[]; skipped?: string; error?: string } = {};
      try { json = JSON.parse(text); } catch { /* оставляем пустым */ }
      if (!res.ok) {
        if (res.status === 504 || /timeout|timed out/i.test(text)) throw new Error("Таймаут — попробуй ещё раз.");
        throw new Error(json.error || `HTTP ${res.status}: ${text.slice(0, 120)}`);
      }
      if (json.skipped) { setInfo(json.skipped); return; }
      if (!json.added && !json.edges) {
        // Тут важнее всего показать источники: «ничего нового» при непрочитанном
        // диске и при прочитанном — это два разных диагноза.
        setInfo(`Нового ничего нет — мозг актуален.${json.sources?.length ? ` Прочитано: ${json.sources.join(", ")}.` : ""}`);
        return;
      }
      if (json.data && json.id) {
        setGraph(json.data);
        setSnapshotId(json.id);
        setSelectedId(null);
        setDirty(false);
        setSnapshots((s) => s.map((x) => (x.id === json.id ? { ...x, data: json.data!, updated_at: new Date().toISOString() } : x)));
      }
      // Источники — чтобы «диск не читается» отличалось от «диск прочитан,
      // но модель ничего оттуда не взяла».
      const src = json.sources?.length ? ` · прочитано: ${json.sources.join(", ")}` : "";
      setInfo(`Дополнено: +${json.added ?? 0} узл., +${json.edges ?? 0} связ.${src}`);
      // Что именно добавилось — иначе «+7 узлов» ничего не говорит.
      setAddedLabels(json.labels ?? []);
      setAddedOpen((json.labels?.length ?? 0) <= 8);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  /**
   * Полный обход Диска: читаем каждый файл целиком, пачками, пока не кончатся.
   *
   * Цикл живёт здесь, а не на сервере, потому что обход длиннее любого лимита
   * серверной функции. Состояние обхода — один курсор, так что прерванный
   * обход (кнопкой или закрытой вкладкой) продолжается с того же места.
   */
  const runSweep = async () => {
    setError(""); setInfo(""); setAddedLabels([]);
    let plan: { files: number; iterations: number; newFiles: number; newIterations: number };
    try {
      const res = await fetch("/api/workspace/brain/sweep");
      plan = await res.json();
      if (!res.ok) throw new Error((plan as unknown as { error?: string }).error || `HTTP ${res.status}`);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    if (!plan.files) { setError("В индексе Диска нет файлов — подключи папки и дождись синка."); return; }

    // Уже разобранное не перечитываем: после полного обхода «дополнить» — это
    // несколько новых файлов, а не сотня старых по второму разу. Полный проход
    // остаётся доступен явным отказом — он нужен, когда сменилась модель или
    // хочется пересобрать картину с нуля.
    const partial = plan.newFiles > 0 && plan.newFiles < plan.files;
    let scope: "all" | "new" = "all";
    if (partial) {
      scope = confirm(
        `Новых или изменённых файлов: ${plan.newFiles} (${plan.newIterations} итер.).\n\n` +
        `ОК — прочитать только их.\nОтмена — перечитать все ${plan.files} заново (${plan.iterations} итер.).`,
      ) ? "new" : "all";
    } else if (plan.newFiles === 0) {
      // Всё разобрано — молча перечитывать сотню файлов было бы неожиданно дорого.
      if (!confirm(`Все ${plan.files} файлов уже разобраны. Перечитать заново? Это ${plan.iterations} итераций.`)) return;
    } else if (!confirm(`Прочитать все ${plan.files} файлов Диска целиком? Это ${plan.iterations} итераций и займёт время.`)) {
      return;
    }

    const planned = scope === "new" ? plan.newIterations : plan.iterations;

    sweepStop.current = false;
    setBusy("sweep");
    let cursor = 0, added = 0, edges = 0, step_i = 0;
    const problems: string[] = [];
    try {
      for (;;) {
        if (sweepStop.current) { setInfo(`Обход остановлен: +${added} узл., +${edges} связ.`); break; }
        const res = await fetch("/api/workspace/brain/sweep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cursor, scope }),
        });
        const step = await res.json();
        if (!res.ok) throw new Error(step.error || `HTTP ${res.status}`);
        cursor = step.cursor;
        // Номер итерации считаем сами: в режиме «только новое» очередь на сервере
        // тает по ходу обхода, и его собственный счётчик всегда показывал бы 1.
        step_i++;
        added += step.added ?? 0;
        edges += step.edges ?? 0;
        // Пачка могла не задаться — это не повод ронять весь обход, но и молчать
        // о ней нельзя: в конце покажем, сколько пачек прошло мимо.
        if (step.error) problems.push(`${step.iteration}: ${step.error}`);
        // Граф обновляем сразу — обход на два десятка итераций иначе выглядит
        // как зависшая вкладка. Выделение НЕ сбрасываем: можно ходить по узлам,
        // пока обход идёт. Пришедший граф — это то, что уже лежит на сервере,
        // так что dirty не поднимаем.
        if (step.data) {
          setGraph(step.data);
          setSnapshots((s) => s.map((x) => (x.id === snapshotId ? { ...x, data: step.data, updated_at: new Date().toISOString() } : x)));
        }
        setSweep({
          iteration: step_i, iterations: Math.max(planned, step_i),
          added, edges, batch: step.batch ?? [],
          labels: step.labels ?? [],
          note: step.error ?? "",
        });
        if (step.done) {
          setInfo(
            `Обход завершён: ${scope === "new" ? plan.newFiles : plan.files} файлов, +${added} узл., +${edges} связ.` +
            (problems.length ? ` Пачек с ошибкой: ${problems.length}.` : ""),
          );
          break;
        }
      }
      // Граф уже приезжал с каждой итерацией; в конце перечитываем список
      // снапшотов, чтобы подхватить время обновления и не разойтись с сервером.
      const rows = await wsList<BrainSnapshot>("brain");
      setSnapshots(rows);
      if (rows.length) { setGraph(rows[0].data); setSnapshotId(rows[0].id); setDirty(false); }
    } catch (e) {
      // Разобранное уже отмечено на сервере, поэтому повторный запуск продолжит
      // с этого места — об этом стоит сказать, иначе выглядит как потеря работы.
      setError(`${(e as Error).message} · прервано на итерации ${step_i}, разобранное сохранено — запусти обход ещё раз`);
    } finally {
      setBusy("");
      setSweep(null);
    }
  };

  const generate = async () => {
    setBusy("generate"); setError(""); setInfo(""); setAddedLabels([]);
    try {
      const res = await fetch("/api/workspace/brain/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      // Сервер может ответить не-JSON (например, текст 504 от Vercel при таймауте).
      const text = await res.text();
      let json: { data?: BrainState; sources?: string[]; error?: string } = {};
      try { json = JSON.parse(text); } catch { /* оставляем пустым */ }
      if (!res.ok || !json.data) {
        if (res.status === 504 || /timeout|timed out/i.test(text)) {
          throw new Error("Сервер не успел за отведённое время (таймаут). Модель думала слишком долго — попробуй ещё раз или поставь модель побыстрее в OPENROUTER_MODEL.");
        }
        throw new Error(json.error || `HTTP ${res.status}: ${text.slice(0, 120)}`);
      }
      resetBodies();
      setGraph(json.data);
      setSelectedId(null);
      setDirty(true);
      // Свежая сборка — это НОВЫЙ мозг: отвязываемся от снапшота, чтобы
      // «Сохранить» создал новую запись, а старые остались для сравнения.
      setSnapshotId("");
      setTitle(`Мозг ${new Date().toLocaleDateString("ru-RU")}`);
      if (json.sources?.length) setInfo(`Прочитано: ${json.sources.join(", ")}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const saveSnapshot = async (asNew = false) => {
    setBusy("save"); setError("");
    try {
      // Впечатываем текущие координаты, чтобы снапшот восстанавливался как был.
      // Сохраняем `graph`, а не viewGraph: достроенные центры категорий —
      // отображаемая условность и в снапшот попадать не должны.
      const pos = positions();
      const withPos: BrainState = {
        ...graph,
        nodes: graph.nodes.map((n) => {
          const b = pos.get(n.id);
          return b ? { ...n, x: b.x, y: b.y } : n;
        }),
      };
      if (snapshotId && !asNew) {
        const row = await wsUpdate<BrainSnapshot>("brain", snapshotId, { title, data: withPos });
        setSnapshots((s) => s.map((x) => (x.id === row.id ? row : x)));
      } else {
        const row = await wsCreate<BrainSnapshot>("brain", { title, data: withPos });
        setSnapshots((s) => [row, ...s]);
        setSnapshotId(row.id);
      }
      setDirty(false);
    } catch (e) {
      setError(`Не удалось сохранить: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  const loadSnapshot = (id: string) => {
    if (id === "new") {
      resetBodies();
      setGraph({ nodes: [], edges: [] });
      setSnapshotId("");
      setTitle("Мой мозг");
      setSelectedId(null);
      setDirty(false);
      return;
    }
    const row = snapshots.find((s) => s.id === id);
    if (!row) return;
    resetBodies();
    setGraph(row.data);
    setSnapshotId(row.id);
    setTitle(row.title);
    setSelectedId(null);
    setDirty(false);
  };

  const deleteSnapshot = async () => {
    if (!snapshotId) return;
    try {
      await wsDelete("brain", snapshotId);
      setSnapshots((s) => s.filter((x) => x.id !== snapshotId));
      loadSnapshot("new");
    } catch (e) {
      setError(`Не удалось удалить: ${(e as Error).message}`);
    }
  };

  /** Новый узел. Если сейчас выделен другой — сразу вешаем связь с ним:
   *  узел почти никогда не нужен сам по себе, а искать его потом в списке
   *  привязки дороже, чем отменить лишнее ребро. */
  const addNode = () => {
    const id = `n${Date.now()}`;
    const parent = selectedId;
    setGraph((g) => ({
      nodes: [...g.nodes, { id, label: "Новый узел", category: "other", importance: 3, summary: "", source: null }],
      edges: parent && g.nodes.some((n) => n.id === parent)
        ? [...g.edges, { id: `e${Date.now()}`, from: parent, to: id }]
        : g.edges,
    }));
    setSelectedId(id);
    setLinkPicker(false);
    setDirty(true);
  };

  const patchNode = (id: string, patch: Partial<BrainNode>) => {
    setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
    setDirty(true);
  };

  const deleteNode = (id: string) => {
    setGraph((g) => ({
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    setSelectedId(null);
    setLinkPicker(false);
    setDirty(true);
  };

  const deleteEdge = (id: string) => {
    setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
    setDirty(true);
  };

  const openSource = (n: BrainNode) => {
    if (!n.source) return;
    if (n.source.url) { window.open(n.source.url, "_blank", "noopener"); return; }
    const file = SOURCE_FILE[n.source.panel];
    if (file) openFile(file);
  };

  const selected = selectedId ? graph.nodes.find((n) => n.id === selectedId) ?? null : null;
  const selectedEdges = selected
    ? graph.edges.filter((e) => e.from === selected.id || e.to === selected.id)
    : [];
  const nodeLabel = (id: string) => graph.nodes.find((n) => n.id === id)?.label ?? id;

  /**
   * Кандидаты для привязки: всё, кроме самого узла и тех, с кем связь уже есть.
   * Сортировка по весу — та же величина, что задаёт размер узла на холсте
   * (важность + связность), поэтому сверху оказываются «якоря» графа, к которым
   * новый узел чаще всего и нужно цеплять.
   */
  const linkCandidates = useMemo(() => {
    if (!selected) return [];
    const linked = new Set(selectedEdges.map((e) => (e.from === selected.id ? e.to : e.from)));
    const q = linkQuery.trim().toLowerCase();
    return graph.nodes
      .filter((n) => n.id !== selected.id && !linked.has(n.id))
      .filter((n) => !q || n.label.toLowerCase().includes(q) || n.category.toLowerCase().includes(q))
      .sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0) || a.label.localeCompare(b.label))
      .slice(0, 50);
  }, [selected, selectedEdges, graph.nodes, linkQuery, weights]);

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col px-4 pb-4">
      <div className="flex items-center gap-2 py-3">
        <Brain size={18} className="text-vsc-accent" />
        <h1 className="text-[15px] font-semibold text-vsc-bright">Второй мозг</h1>
        <span className="text-[12px] text-vsc-muted">
          {graph.nodes.length} узлов · {graph.edges.length} связей{dirty ? " · не сохранено" : ""}
        </span>
        <div className="relative ml-auto w-64">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-vsc-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по узлам…"
            className="w-full rounded border border-vsc-line bg-vsc-sidebar py-1.5 pl-7 pr-7 text-[12.5px] text-vsc-text outline-none focus:border-vsc-accent"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-vsc-muted hover:text-vsc-text">
              <X size={13} />
            </button>
          )}
          {matched && (
            <div className="absolute right-0 top-full z-10 mt-1 max-h-64 w-72 overflow-y-auto rounded border border-vsc-line bg-vsc-bg py-1 shadow-xl">
              <div className="px-3 py-1 text-[11px] text-vsc-muted">Найдено: {matched.length}</div>
              {matched.slice(0, 40).map((n) => (
                <button
                  key={n.id}
                  onClick={() => focusNode(n.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-vsc-text hover:bg-vsc-hover"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: catColor(n.category) }} />
                  <span className="truncate">{n.label}</span>
                </button>
              ))}
              {!matched.length && <div className="px-3 py-2 text-[12px] text-vsc-muted">Ничего не найдено.</div>}
            </div>
          )}
        </div>
      </div>

      {demo && <GuestBanner what="граф знаний" />}

      {/* toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={demo || !owner || busy !== ""}
          className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[12.5px] text-white hover:opacity-90 disabled:opacity-40"
          title="ИИ прочитает все источники и соберёт граф заново"
        >
          {busy === "generate" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Собрать мозг
        </button>
        <button
          onClick={() => void augment()}
          disabled={demo || !owner || busy !== "" || !snapshotId}
          className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
          title="ИИ добавит в последний снапшот только новое, не пересобирая весь граф"
        >
          {busy === "augment" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Дополнить
        </button>
        <button
          onClick={previewClean}
          disabled={demo || !owner || busy !== "" || !snapshotId}
          className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
          title="Найти дубли, битые связи и одинокие мелкие узлы"
        >
          {busy === "clean" ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
          Почистить
        </button>
        <button
          onClick={() => setFilePicker(true)}
          disabled={demo || !owner || busy !== "" || !snapshotId}
          className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
          title="Выбрать конкретные файлы Диска и разобрать именно их"
        >
          <FileText size={14} />
          Дополнить по файлам
        </button>
        <button
          onClick={() => void runSweep()}
          disabled={demo || !owner || busy !== "" || !snapshotId}
          className="flex items-center gap-1.5 rounded border border-vsc-accent/60 bg-vsc-accent/10 px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-accent/20 disabled:opacity-40"
          title="Прочитать КАЖДЫЙ файл Диска целиком, пачками, и внести всё в мозг"
        >
          {busy === "sweep" ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
          Полный обход
        </button>
        <button
          onClick={() => { setBlockOpen((v) => !v); if (!blockOpen) void loadBlocklist(); }}
          disabled={demo || !owner}
          className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
          title="Темы, которые мозгу запрещено заводить"
        >
          <Ban size={14} />
          Чёрный список{blockRules.length ? ` (${blockRules.length})` : ""}
        </button>
        {/* Свобода сборки — влияет и на «Собрать», и на «Дополнить». */}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as BrainMode)}
          disabled={demo || !owner || busy !== ""}
          title={BRAIN_MODE_HINT[mode]}
          className="rounded border border-vsc-line bg-vsc-sidebar px-2 py-1.5 text-[12.5px] text-vsc-text outline-none focus:border-vsc-accent disabled:opacity-40"
        >
          {/* «Полный обход» сюда не попадает: это не степень свободы, а отдельное
              длинное действие со своим циклом и прогрессом — у него своя кнопка.
              В выпадашке он выглядел выбираемым, но выбор ничего не делал. */}
          {BRAIN_MODES.filter((m) => m !== "total").map((m) => (
            <option key={m} value={m}>{BRAIN_MODE_LABEL[m]}</option>
          ))}
        </select>
        <button
          onClick={addNode}
          disabled={demo}
          className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
        >
          <Plus size={14} /> Узел
        </button>
        <div className="mx-1 h-5 w-px bg-vsc-line" />
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          disabled={demo}
          className="w-40 rounded border border-vsc-line bg-transparent px-2 py-1.5 text-[12.5px] text-vsc-text outline-none focus:border-vsc-accent disabled:opacity-40"
          placeholder="Название снапшота"
        />
        <button
          onClick={() => saveSnapshot()}
          disabled={demo || busy !== ""}
          className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
          title={snapshotId ? "Обновить текущий снапшот" : "Сохранить как новый снапшот"}
        >
          {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Сохранить
        </button>
        {snapshotId && !demo && (
          <button
            onClick={() => saveSnapshot(true)}
            disabled={busy !== ""}
            className="rounded border border-vsc-line px-2.5 py-1.5 text-[12.5px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:opacity-40"
            title="Сохранить копией, не трогая текущий снапшот"
          >
            Как новый
          </button>
        )}
        <select
          value={snapshotId || "new"}
          onChange={(e) => loadSnapshot(e.target.value)}
          disabled={demo}
          className="rounded border border-vsc-line bg-vsc-sidebar px-2 py-1.5 text-[12.5px] text-vsc-text outline-none disabled:opacity-40"
        >
          <option value="new">— новый граф —</option>
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} · {new Date(s.updated_at).toLocaleDateString("ru-RU")}
            </option>
          ))}
        </select>
        {snapshotId && !demo && (
          <button onClick={deleteSnapshot} title="Удалить снапшот" className="rounded p-1.5 text-vsc-muted hover:bg-vsc-hover hover:text-red-400">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Прогресс обхода: без него десяток минут выглядит как зависшая вкладка. */}
      {sweep && (
        <div className="mb-2 rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[12px]">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-vsc-text">
              Обход: итерация {sweep.iteration} из {sweep.iterations} · +{sweep.added} узл., +{sweep.edges} связ.
            </span>
            <button
              onClick={() => { sweepStop.current = true; }}
              className="rounded border border-vsc-line px-2 py-0.5 text-[11px] text-vsc-muted hover:bg-vsc-hover"
            >
              Остановить
            </button>
          </div>
          <div className="mb-1.5 h-1 overflow-hidden rounded bg-vsc-line">
            <div
              className="h-full bg-vsc-accent transition-all"
              style={{ width: `${Math.round((sweep.iteration / Math.max(1, sweep.iterations)) * 100)}%` }}
            />
          </div>
          <div className="truncate text-[11px] text-vsc-muted">Читаю: {sweep.batch.join(", ")}</div>
          {/* Что завелось на прошлой пачке — «+6 узлов» само по себе не говорит,
              взяла ли модель суть файла или отписалась общими словами. */}
          {!!sweep.labels.length && (
            <div className="mt-1 truncate text-[11px] text-vsc-text/70">
              Завелось: {sweep.labels.slice(0, 12).join(", ")}
              {sweep.labels.length > 12 ? ` и ещё ${sweep.labels.length - 12}` : ""}
            </div>
          )}
          {sweep.note && <div className="mt-1 text-[11px] text-amber-300/80">{sweep.note}</div>}
        </div>
      )}

      {error && <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-300">{error}</div>}
      {info && <div className="mb-2 rounded border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-[12px] text-vsc-muted">{info}</div>}

      {filePicker && (
        <SourcePicker
          onClose={() => setFilePicker(false)}
          onConfirm={(fileIds, projectIds) => { setFilePicker(false); void augment(fileIds, projectIds); }}
        />
      )}

      {/* Чёрный список: запрет действует и в промпте, и при мерже, и при чистке. */}
      {blockOpen && (
        <div className="mb-2 rounded border border-vsc-line bg-vsc-sidebar px-3 py-2 text-[12px]">
          <div className="mb-1.5 text-vsc-muted">
            Мозг не будет заводить узлы, у которых название или суть содержит одну из
            строк. Сравнение без учёта регистра, по подстроке.
          </div>
          <div className="mb-2 flex gap-2">
            <input
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addBlockRule(); }}
              placeholder="например: TeleportHQ"
              className="flex-1 rounded border border-vsc-line bg-vsc-bg px-2 py-1 text-vsc-text outline-none focus:border-vsc-accent"
            />
            <button
              onClick={() => void addBlockRule()}
              disabled={blockInput.trim().length < 2}
              className="rounded border border-vsc-line px-2 py-1 text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
            >
              Добавить
            </button>
          </div>
          {blockRules.length ? (
            <div className="flex flex-wrap gap-1.5">
              {blockRules.map((r) => (
                <span key={r.id} className="flex items-center gap-1 rounded border border-vsc-line px-2 py-0.5 text-vsc-text">
                  {r.pattern}
                  <button
                    onClick={() => void removeBlockRule(r.id)}
                    className="text-vsc-muted hover:text-red-400"
                    title="Убрать из списка"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-vsc-muted">Список пуст.</div>
          )}
          <div className="mt-2 text-vsc-muted">
            Уже накопившиеся узлы по этим темам уберёт кнопка «Почистить».
          </div>
        </div>
      )}

      {/* Предпросмотр чистки: удаление необратимо, поэтому сначала список. */}
      {cleanPlan && (
        <div className="mb-2 rounded border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[12px]">
          <div className="mb-1 font-medium text-vsc-text">
            Под удаление: {cleanPlan.nodes.length} узл. и {cleanPlan.edges} связ.
            <span className="text-vsc-muted"> · останется {cleanPlan.keptNodes} узл., {cleanPlan.keptEdges} связ.</span>
          </div>
          <div className="max-h-40 overflow-auto">
            {cleanPlan.nodes.map((n) => (
              <div key={n.id} className="flex items-baseline gap-2 py-0.5">
                <span className="truncate text-vsc-text">{n.label}</span>
                <span className="shrink-0 text-vsc-muted">— {n.reason}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => void applyClean(false)}
              disabled={busy !== ""}
              className="rounded border border-vsc-line px-2 py-1 text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
            >
              Удалить дубли и битые связи
            </button>
            <button
              onClick={() => void applyClean(true)}
              disabled={busy !== ""}
              title="Плюс узлы без связей с важностью 1–2"
              className="rounded border border-vsc-line px-2 py-1 text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
            >
              И одинокую мелочь тоже
            </button>
            <button
              onClick={() => setCleanPlan(null)}
              className="rounded px-2 py-1 text-vsc-muted hover:bg-vsc-hover"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      {addedLabels.length > 0 && (
        <div className="mb-2 rounded border border-vsc-line bg-vsc-sidebar text-[12px]">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <button
              onClick={() => setAddedOpen((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-vsc-text hover:text-vsc-accent"
            >
              {addedOpen ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
              Добавлено узлов: {addedLabels.length}
            </button>
            <button
              onClick={() => setAddedLabels([])}
              title="Скрыть список"
              className="shrink-0 rounded p-0.5 text-vsc-muted hover:text-vsc-text"
            >
              <X size={12} />
            </button>
          </div>
          {addedOpen && (
            <div className="max-h-52 overflow-auto border-t border-vsc-line px-2 py-1">
              {addedLabels.map((label) => {
                // Дельта отдаёт label'ы, а не id — ищем узел по имени.
                const node = graph.nodes.find((n) => n.label === label);
                return (
                  <button
                    key={label}
                    onClick={() => node && focusNode(node.id)}
                    disabled={!node}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-vsc-hover disabled:cursor-default disabled:opacity-60"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: node ? catColor(node.category) : "#666" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-vsc-text">{label}</span>
                    {node && <span className="shrink-0 text-[10px] text-vsc-muted">{node.importance}★</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {linkFrom && (
        <div className="mb-2 rounded border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-[12px] text-vsc-muted">
          Режим связи: кликни второй узел, чтобы соединить с «{nodeLabel(linkFrom)}».{" "}
          <button onClick={() => setLinkFrom(null)} className="text-vsc-accent hover:underline">Отмена</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        {/* граф */}
        <div ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden rounded border border-vsc-line bg-vsc-sidebar/40">
          <canvas
            ref={canvasRef}
            className="block cursor-grab touch-none active:cursor-grabbing"
            {...canvasHandlers}
          />
          {!graph.nodes.length && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-[13px] text-vsc-muted">
              Пусто. Нажми «Собрать мозг» — ИИ прочитает задачи, заметки, календарь, почту и Notion и построит граф. Или добавь узлы вручную.
            </div>
          )}
          {/* миникарта: где я на графе и куда прыгнуть */}
          {graph.nodes.length > 0 && (
            <div className="absolute right-2 top-2 rounded border border-vsc-line bg-black/40 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2 px-1.5 py-0.5">
                <span className="text-[10px] text-vsc-muted">Карта</span>
                <button
                  onClick={() => setMiniOn((v) => !v)}
                  className="rounded p-0.5 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
                  title={miniOn ? "Свернуть карту" : "Развернуть карту"}
                >
                  {miniOn ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
              {miniOn && (
                <canvas
                  ref={miniRef}
                  onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); miniGo(e); }}
                  onPointerMove={miniGo}
                  className="block h-29.5 w-42.5 cursor-crosshair touch-none"
                />
              )}
            </div>
          )}

          {/* легенда: только категории, реально присутствующие в графе */}
          {graph.nodes.length > 0 && (
            <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 rounded bg-black/25 px-2 py-1">
              {[...new Set(graph.nodes.map((n) => n.category))].map((c) => (
                <span key={c} className="flex items-center gap-1 text-[10.5px] text-vsc-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: catColor(c) }} /> {catLabel(c)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* инспектор узла */}
        {selected && (
          <div className="flex w-72 shrink-0 flex-col gap-2.5 overflow-y-auto rounded border border-vsc-line bg-vsc-sidebar p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] text-vsc-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: catColor(selected.category) }} />
                Узел
              </span>
              <button onClick={() => setSelectedId(null)} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover">
                <X size={14} />
              </button>
            </div>
            <input
              value={selected.label}
              onChange={(e) => patchNode(selected.id, { label: e.target.value })}
              disabled={demo}
              className="rounded border border-vsc-line bg-transparent px-2 py-1.5 text-[13px] text-vsc-bright outline-none focus:border-vsc-accent disabled:opacity-60"
            />
            <div className="flex gap-2">
              <input
                list="brain-categories"
                value={selected.category}
                onChange={(e) => patchNode(selected.id, { category: e.target.value.trim().toLowerCase().slice(0, 30) || "other" })}
                disabled={demo}
                placeholder="категория"
                className="min-w-0 flex-1 rounded border border-vsc-line bg-vsc-sidebar px-2 py-1.5 text-[12.5px] text-vsc-text outline-none focus:border-vsc-accent disabled:opacity-60"
              />
              <datalist id="brain-categories">
                {[...new Set([...CATEGORIES.map((c) => c.key), ...graph.nodes.map((n) => n.category)])].map((c) => (
                  <option key={c} value={c}>{catLabel(c)}</option>
                ))}
              </datalist>
              <label className="flex items-center gap-1.5 text-[12px] text-vsc-muted" title="Важность 1–5">
                ★
                <input
                  type="range" min={1} max={5} step={1}
                  value={selected.importance}
                  onChange={(e) => patchNode(selected.id, { importance: Number(e.target.value) })}
                  disabled={demo}
                  className="w-16 accent-(--vsc-accent,#4fc1ff)"
                />
                {selected.importance}
              </label>
            </div>
            <div className="text-[11px] text-vsc-muted">
              Вес в графе: <span className="text-vsc-text">{Math.round((weights.get(selected.id) ?? 0) * 100)}%</span>
              {" "}— из важности и числа связей. {(weights.get(selected.id) ?? 0) < NOISE && "Сейчас это фон: подпись скрыта, пока не наведёшь."}
            </div>
            <textarea
              value={selected.summary}
              onChange={(e) => patchNode(selected.id, { summary: e.target.value })}
              disabled={demo}
              rows={4}
              placeholder="Суть узла…"
              className="resize-none rounded border border-vsc-line bg-transparent px-2 py-1.5 text-[12.5px] leading-relaxed text-vsc-text outline-none focus:border-vsc-accent disabled:opacity-60"
            />
            {selected.source && (selected.source.url || SOURCE_FILE[selected.source.panel]) && (
              <button
                onClick={() => openSource(selected)}
                className="flex items-center gap-1.5 rounded border border-vsc-line px-2 py-1.5 text-left text-[12px] text-vsc-accent hover:bg-vsc-hover"
              >
                <ExternalLink size={13} className="shrink-0" />
                <span className="truncate">Источник: {selected.source.ref || selected.source.panel}</span>
              </button>
            )}
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">Связи ({selectedEdges.length})</div>
              {selectedEdges.map((e) => {
                const otherId = e.from === selected.id ? e.to : e.from;
                return (
                  <div key={e.id} className="group flex items-center gap-1.5 rounded px-1 py-0.5 text-[12px] text-vsc-text hover:bg-vsc-hover">
                    <button onClick={() => setSelectedId(otherId)} className="min-w-0 flex-1 truncate text-left hover:text-vsc-accent">
                      {nodeLabel(otherId)}{e.label ? ` — ${e.label}` : ""}
                    </button>
                    {!demo && (
                      <button onClick={() => deleteEdge(e.id)} className="rounded p-0.5 text-vsc-muted opacity-0 hover:text-red-400 group-hover:opacity-100">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              {!demo && !linkPicker && (
                <div className="mt-1 flex gap-1">
                  <button
                    onClick={() => { setLinkPicker(true); setLinkQuery(""); }}
                    className="flex flex-1 items-center gap-1.5 rounded border border-dashed border-vsc-line px-2 py-1 text-[12px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
                  >
                    <Link2 size={12} /> Связать с…
                  </button>
                  <button
                    onClick={() => setLinkFrom(selected.id)}
                    title="Выбрать узел кликом на холсте"
                    className="rounded border border-dashed border-vsc-line px-2 py-1 text-[12px] text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"
                  >
                    на холсте
                  </button>
                </div>
              )}
              {!demo && linkPicker && (
                <div className="mt-1 rounded border border-vsc-line bg-vsc-sidebar p-1">
                  <div className="mb-1 flex items-center gap-1">
                    <input
                      autoFocus
                      value={linkQuery}
                      onChange={(e) => setLinkQuery(e.target.value)}
                      placeholder="Найти узел…"
                      className="min-w-0 flex-1 rounded border border-vsc-line bg-vsc-bg px-2 py-1 text-[12px] text-vsc-text outline-none focus:border-vsc-accent"
                    />
                    <button onClick={() => setLinkPicker(false)} className="rounded p-1 text-vsc-muted hover:text-vsc-text">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    {linkCandidates.length === 0 ? (
                      <p className="px-1 py-1.5 text-[12px] text-vsc-muted">
                        {linkQuery ? "Ничего не найдено." : "Не с чем связывать."}
                      </p>
                    ) : (
                      linkCandidates.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { addEdge(selected.id, n.id); setLinkQuery(""); }}
                          className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-vsc-hover"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: catColor(n.category) }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[12px] text-vsc-text">{n.label}</span>
                          <span className="shrink-0 text-[10px] text-vsc-muted">
                            {n.importance}★ · {degrees.get(n.id) ?? 0}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {!demo && (
              <button
                onClick={() => deleteNode(selected.id)}
                className="mt-auto flex items-center gap-1.5 rounded border border-red-500/40 px-2 py-1.5 text-[12px] text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={13} /> Удалить узел
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
