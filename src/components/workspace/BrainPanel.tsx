"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Sparkles, Plus, Save, Trash2, ExternalLink, Link2, X, Loader2, Search } from "lucide-react";
import { useSession } from "@/lib/session";
import { useEditor } from "@/lib/store";
import {
  wsList, wsCreate, wsUpdate, wsDelete,
  DEMO_BRAIN,
  type BrainState, type BrainNode, type BrainEdge, type BrainSnapshot, type BrainCategory,
} from "@/lib/workspace";
import { GuestBanner } from "./GuestBanner";

/**
 * «Второй мозг» — граф знаний, собранный ИИ из всего воркспейса (задачи,
 * заметки, календарь, почта, Telegram, Notion, …). Плавающие точки-узлы с
 * категорией/важностью и связями; каждый узел помнит источник. Граф можно
 * править руками, пересобирать ИИ и сохранять снапшоты состояния (ws_brain).
 */

/** Базовые категории с фиксированными цветами; всё прочее ИИ добавляет сам. */
const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: "project", label: "Проекты", color: "#c586c0" },
  { key: "work", label: "Работа", color: "#4fc1ff" },
  { key: "idea", label: "Идеи", color: "#dcdcaa" },
  { key: "people", label: "Люди", color: "#4ec9b0" },
  { key: "finance", label: "Финансы", color: "#ce9178" },
  { key: "learn", label: "Обучение", color: "#9cdcfe" },
  { key: "life", label: "Жизнь", color: "#6a9955" },
  { key: "other", label: "Прочее", color: "#858585" },
];

/** Палитра для категорий, которых нет в базовом списке, — цвет стабилен по имени. */
const EXTRA_COLORS = ["#d16969", "#b5cea8", "#569cd6", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#e06c75"];

function catColor(c: BrainCategory): string {
  const base = CATEGORIES.find((x) => x.key === c);
  if (base) return base.color;
  let h = 0;
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0;
  return EXTRA_COLORS[h % EXTRA_COLORS.length];
}

const catLabel = (c: BrainCategory) => CATEGORIES.find((x) => x.key === c)?.label ?? c;

/* ---- вес узла --------------------------------------------------------- */

/**
 * Вес 0..1 — насколько узел «тяжёлый». Считается на лету из importance И
 * связности: узел, к которому сходится полграфа, весит больше одинокого с той
 * же важностью. Нормализация РАНГОВАЯ, а не по абсолютной шкале: если модель
 * наставила всем 4 (а она это любит), ранги всё равно разведут узлы по весу —
 * поэтому старые снапшоты чинятся без миграции данных.
 */
function computeWeights(nodes: BrainNode[], edges: BrainEdge[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  // Связность в log-шкале: 0→1 связь заметна, 8→9 уже почти нет.
  const score = nodes.map((n) => ({
    id: n.id,
    s: Math.max(1, Math.min(5, n.importance)) + Math.log1p(degree.get(n.id) ?? 0) * 1.7,
  }));

  const out = new Map<string, number>();
  if (!score.length) return out;
  const sorted = [...score].sort((a, b) => a.s - b.s);
  // Одинаковый score → одинаковый ранг, иначе узлы одной важности дрожали бы.
  const rankOf = new Map<number, number>();
  sorted.forEach((x, i) => { if (!rankOf.has(x.s)) rankOf.set(x.s, i); });
  const last = Math.max(1, sorted.length - 1);
  for (const x of score) {
    const rank = rankOf.get(x.s)! / last;
    // Смешиваем ранг с абсолютом: ранг даёт контраст даже в плоском графе,
    // абсолют не даёт «повысить» откровенный мусор в маленьком графе.
    out.set(x.id, rank * 0.65 + Math.min(1, (x.s - 1) / 6) * 0.35);
  }
  return out;
}

const radius = (w: number) => 3.5 + w * 11;
/** Ниже этого веса узел — фон: гасим и прячем подпись, чтобы не забивал холст. */
const NOISE = 0.28;

/** Внутренние вкладки-источники: panel → id файла в IDE. */
const SOURCE_FILE: Record<string, string> = {
  tasks: "workspace/tasks.todo",
  notes: "workspace/notes.md",
  calendar: "workspace/calendar.tsx",
  mail: "workspace/mail.tsx",
  telegram: "workspace/telegram.tsx",
  notion: "workspace/notion.tsx",
  bitrix: "workspace/bitrix.tsx",
  projects: "workspace/projects.tsx",
  subscriptions: "workspace/subscriptions.tsx",
  news: "workspace/news.tsx",
};

/* ---- физика: позиции/скорости живут вне React, в ref ------------------ */

interface Body { x: number; y: number; vx: number; vy: number; phase: number }

type Bodies = Map<string, Body>;

function seedBody(i: number, total: number, w: number, h: number, node: BrainNode): Body {
  // Стартуем по кругу (или с сохранённых координат), дальше разруливает физика.
  const angle = (i / Math.max(1, total)) * Math.PI * 2;
  const r = Math.min(w, h) * 0.3;
  return {
    x: node.x ?? w / 2 + Math.cos(angle) * r,
    y: node.y ?? h / 2 + Math.sin(angle) * r,
    vx: 0, vy: 0,
    phase: Math.random() * Math.PI * 2,
  };
}

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
  const [busy, setBusy] = useState<"" | "generate" | "augment" | "save">("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  // Список привязки в карточке узла: открыт/закрыт + строка фильтра.
  const [linkPicker, setLinkPicker] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodies = useRef<Bodies>(new Map());
  const graphRef = useRef(graph);
  graphRef.current = graph;
  // Веса пересчитываем только при смене графа — в кадре анимации это дорого.
  const weights = useMemo(() => computeWeights(graph.nodes, graph.edges), [graph]);
  const weightsRef = useRef(weights);
  weightsRef.current = weights;
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
  const view = useRef({ ox: 0, oy: 0, scale: 1 });
  const pointer = useRef({ dragId: null as string | null, panning: false, lastX: 0, lastY: 0, moved: false });
  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const linkFromRef = useRef(linkFrom);
  linkFromRef.current = linkFrom;

  // Поиск: узлы, попавшие под запрос (по названию, сути, категории). null = поиск неактивен.
  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return graph.nodes.filter(
      (n) => n.label.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.category.toLowerCase().includes(q),
    );
  }, [search, graph]);
  const matchedIds = useMemo(() => (matched ? new Set(matched.map((n) => n.id)) : null), [matched]);
  const searchRef = useRef<Set<string> | null>(null);
  searchRef.current = matchedIds;

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

  /* ---- симуляция + отрисовка ------------------------------------------ */

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = wrap.clientWidth; h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let t = 0;
    const tick = () => {
      const g = graphRef.current;
      const map = bodies.current;

      // Синхронизируем тела с узлами (новые — засеять, удалённые — убрать).
      g.nodes.forEach((n, i) => {
        if (!map.has(n.id)) map.set(n.id, seedBody(i, g.nodes.length, w, h, n));
      });
      for (const id of [...map.keys()]) {
        if (!g.nodes.some((n) => n.id === id)) map.delete(id);
      }

      // Силы: отталкивание всех от всех, пружины по рёбрам, кластеры, центр, дрейф.
      const wmap = weightsRef.current;
      const arr = g.nodes.map((n) => ({ n, b: map.get(n.id)!, w: wmap.get(n.id) ?? 0.5 }));
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i].b, b = arr[j].b;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = Math.max(80, dx * dx + dy * dy);
          // Тяжёлые расталкивают сильнее — вокруг них появляется воздух,
          // а мелочь слипается плотнее и не растаскивает граф по холсту.
          const same = arr[i].n.category === arr[j].n.category;
          const f = (2600 * (0.55 + arr[i].w + arr[j].w) * (same ? 0.55 : 1)) / d2;
          const d = Math.sqrt(d2);
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
      }

      // Кластеры: узлы одной категории тянутся к общему центру масс, так граф
      // распадается на читаемые «доли» вместо равномерного облака точек.
      const centroids = new Map<string, { x: number; y: number; n: number }>();
      for (const { n, b } of arr) {
        const c = centroids.get(n.category) ?? { x: 0, y: 0, n: 0 };
        c.x += b.x; c.y += b.y; c.n++;
        centroids.set(n.category, c);
      }
      for (const { n, b, w } of arr) {
        const c = centroids.get(n.category)!;
        if (c.n < 2) continue;
        // Лёгкие липнут к своей доле охотнее; тяжёлые держат позицию сами.
        const pull = 0.012 * (1.3 - w);
        b.vx += (c.x / c.n - b.x) * pull;
        b.vy += (c.y / c.n - b.y) * pull;
      }
      for (const e of g.edges) {
        const a = map.get(e.from), b = map.get(e.to);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const f = (d - 130) * 0.004;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      t += 0.016;
      for (const { n, b, w: nw } of arr) {
        // Тяжёлые тянет к центру сильнее (ядро графа), лёгкие уплывают к краю.
        // «Дыхание» им наоборот приглушаем, чтобы опорные узлы не дрожали.
        const gravity = 0.0004 + nw * 0.0012;
        const drift = 0.03 * (1.15 - nw);
        b.vx += (w / 2 - b.x) * gravity + Math.cos(t * 0.6 + b.phase) * drift;
        b.vy += (h / 2 - b.y) * gravity + Math.sin(t * 0.5 + b.phase) * drift;
        if (pointer.current.dragId !== n.id) {
          b.vx *= 0.86; b.vy *= 0.86;
          b.x += b.vx; b.y += b.vy;
        } else {
          b.vx = 0; b.vy = 0;
        }
      }

      // Отрисовка.
      const { ox, oy, scale } = view.current;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      const sel = selectedRef.current;
      const hover = hoverRef.current;
      const neighbors = new Set<string>();
      if (sel) {
        neighbors.add(sel);
        for (const e of g.edges) {
          if (e.from === sel) neighbors.add(e.to);
          if (e.to === sel) neighbors.add(e.from);
        }
      }

      for (const e of g.edges) {
        const a = map.get(e.from), b = map.get(e.to);
        if (!a || !b) continue;
        const active = sel && (e.from === sel || e.to === sel);
        // Связь весит столько же, сколько её более лёгкий конец: линия между
        // двумя мусорными узлами не должна чертить холст наравне с опорной.
        const ew = Math.min(wmap.get(e.from) ?? 0.5, wmap.get(e.to) ?? 0.5);
        ctx.strokeStyle = active ? "rgba(79,193,255,0.75)" : `rgba(140,140,150,${(0.08 + ew * 0.26).toFixed(3)})`;
        ctx.lineWidth = active ? 1.6 : 0.6 + ew * 0.9;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (active && e.label) {
          ctx.fillStyle = "rgba(200,200,210,0.85)";
          ctx.font = "10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(e.label, (a.x + b.x) / 2, (a.y + b.y) / 2 - 4);
        }
      }

      const matches = searchRef.current;
      for (const { n, b, w: nw } of arr) {
        const r = radius(nw);
        // Поиск важнее выделения: гасим всё, что не совпало; иначе — обычная логика соседей.
        const dim = matches ? !matches.has(n.id) : sel ? !neighbors.has(n.id) : false;
        const hit = matches?.has(n.id) ?? false;
        const focused = n.id === sel || n.id === hover || hit;
        const color = catColor(n.category);
        // Лёгкие узлы полупрозрачны — остаются как фон/контекст, но не спорят
        // за внимание с тяжёлыми. Под курсором и в поиске проявляются полностью.
        const weightAlpha = focused ? 1 : 0.3 + Math.min(1, nw / NOISE) * 0.7 * (0.55 + nw * 0.45);
        ctx.globalAlpha = dim ? 0.12 : weightAlpha;
        // Свечение тяжёлых узлов.
        if (nw >= 0.78 && !dim) {
          const glow = ctx.createRadialGradient(b.x, b.y, r * 0.4, b.x, b.y, r * 2.4);
          glow.addColorStop(0, color + "55");
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (hit || n.id === sel || n.id === hover || n.id === linkFromRef.current) {
          ctx.strokeStyle = n.id === linkFromRef.current ? "#dcdcaa" : hit ? "#4fc1ff" : "#ffffff";
          ctx.lineWidth = hit ? 2.2 : 1.6;
          ctx.stroke();
        }
        // Подписи — главный источник каши. Мелочь подписываем только под
        // курсором / в выделении / в поиске, иначе холст забивается текстом.
        if (focused || (nw >= NOISE && !dim)) {
          ctx.globalAlpha = dim ? 0.3 : focused ? 1 : 0.45 + nw * 0.55;
          ctx.fillStyle = "rgba(225,225,235,0.95)";
          ctx.font = `${nw >= 0.78 ? "600 12" : nw >= 0.5 ? "11" : "10"}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(n.label.slice(0, nw >= 0.5 ? 32 : 20), b.x, b.y + r + 12);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  /* ---- указатель: drag / pan / zoom / select --------------------------- */

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { ox, oy, scale } = view.current;
    return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
  }, []);

  const nodeAt = useCallback((wx: number, wy: number): string | null => {
    const g = graphRef.current;
    for (let i = g.nodes.length - 1; i >= 0; i--) {
      const n = g.nodes[i];
      const b = bodies.current.get(n.id);
      if (!b) continue;
      // +5: мелкие узлы иначе почти невозможно попасть курсором.
      const r = radius(weightsRef.current.get(n.id) ?? 0.5) + 5;
      if ((b.x - wx) ** 2 + (b.y - wy) ** 2 <= r * r) return n.id;
    }
    return null;
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = toWorld(e.clientX, e.clientY);
    const id = nodeAt(x, y);
    pointer.current = { dragId: id, panning: !id, lastX: e.clientX, lastY: e.clientY, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointer.current;
    const dx = e.clientX - p.lastX, dy = e.clientY - p.lastY;
    if (p.dragId) {
      const b = bodies.current.get(p.dragId);
      if (b) { b.x += dx / view.current.scale; b.y += dy / view.current.scale; }
      if (Math.abs(dx) + Math.abs(dy) > 1) p.moved = true;
    } else if (p.panning) {
      view.current.ox += dx; view.current.oy += dy;
      if (Math.abs(dx) + Math.abs(dy) > 1) p.moved = true;
    } else {
      const { x, y } = toWorld(e.clientX, e.clientY);
      hoverRef.current = nodeAt(x, y);
    }
    p.lastX = e.clientX; p.lastY = e.clientY;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointer.current;
    if (!p.moved) {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const id = nodeAt(x, y);
      if (id && linkFromRef.current && id !== linkFromRef.current) {
        // Режим связывания: второй клик создаёт ребро.
        const from = linkFromRef.current;
        setGraph((g) => ({
          ...g,
          edges: g.edges.some((ed) => (ed.from === from && ed.to === id) || (ed.from === id && ed.to === from))
            ? g.edges
            : [...g.edges, { id: `e${Date.now()}`, from, to: id }],
        }));
        setDirty(true);
        setLinkFrom(null);
      } else {
        setSelectedId(id);
        if (!id) setLinkFrom(null);
      }
    }
    pointer.current = { dragId: null, panning: false, lastX: 0, lastY: 0, moved: false };
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const v = view.current;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const next = Math.min(2.5, Math.max(0.35, v.scale * factor));
    // Зум к курсору: точка под мышью остаётся на месте.
    v.ox = mx - ((mx - v.ox) / v.scale) * next;
    v.oy = my - ((my - v.oy) / v.scale) * next;
    v.scale = next;
  };

  /* ---- действия -------------------------------------------------------- */

  /** Инкремент: сервер дополняет ПОСЛЕДНИЙ снапшот только новым из источников. */
  const augment = async () => {
    setBusy("augment"); setError(""); setInfo("");
    try {
      const res = await fetch("/api/workspace/brain/augment", { method: "POST" });
      const text = await res.text();
      let json: { data?: BrainState; id?: string; added?: number; edges?: number; skipped?: string; error?: string } = {};
      try { json = JSON.parse(text); } catch { /* оставляем пустым */ }
      if (!res.ok) {
        if (res.status === 504 || /timeout|timed out/i.test(text)) throw new Error("Таймаут — попробуй ещё раз.");
        throw new Error(json.error || `HTTP ${res.status}: ${text.slice(0, 120)}`);
      }
      if (json.skipped) { setInfo(json.skipped); return; }
      if (!json.added && !json.edges) { setInfo("Нового ничего нет — мозг актуален."); return; }
      if (json.data && json.id) {
        setGraph(json.data);
        setSnapshotId(json.id);
        setSelectedId(null);
        setDirty(false);
        setSnapshots((s) => s.map((x) => (x.id === json.id ? { ...x, data: json.data!, updated_at: new Date().toISOString() } : x)));
      }
      setInfo(`Дополнено: +${json.added ?? 0} узл., +${json.edges ?? 0} связ.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const generate = async () => {
    setBusy("generate"); setError(""); setInfo("");
    try {
      const res = await fetch("/api/workspace/brain/generate", { method: "POST" });
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
      bodies.current.clear();
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
      const withPos: BrainState = {
        ...graphRef.current,
        nodes: graphRef.current.nodes.map((n) => {
          const b = bodies.current.get(n.id);
          return b ? { ...n, x: Math.round(b.x), y: Math.round(b.y) } : n;
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
      bodies.current.clear();
      setGraph({ nodes: [], edges: [] });
      setSnapshotId("");
      setTitle("Мой мозг");
      setSelectedId(null);
      setDirty(false);
      return;
    }
    const row = snapshots.find((s) => s.id === id);
    if (!row) return;
    bodies.current.clear();
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

  /** Связать два узла. Дубликат (в любую сторону) молча игнорируем. */
  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    setGraph((g) => ({
      ...g,
      edges: g.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))
        ? g.edges
        : [...g.edges, { id: `e${Date.now()}`, from, to }],
    }));
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

  /** Навести камеру на узел (центрировать) и выделить его. */
  const focusNode = (id: string) => {
    const b = bodies.current.get(id);
    const wrap = wrapRef.current;
    if (b && wrap) {
      const { scale } = view.current;
      view.current.ox = wrap.clientWidth / 2 - b.x * scale;
      view.current.oy = wrap.clientHeight / 2 - b.y * scale;
    }
    setSelectedId(id);
  };

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
          onClick={augment}
          disabled={demo || !owner || busy !== "" || !snapshotId}
          className="flex items-center gap-1.5 rounded border border-vsc-line px-3 py-1.5 text-[12.5px] text-vsc-text hover:bg-vsc-hover disabled:opacity-40"
          title="ИИ добавит в последний снапшот только новое, не пересобирая весь граф"
        >
          {busy === "augment" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Дополнить
        </button>
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

      {error && <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-300">{error}</div>}
      {info && <div className="mb-2 rounded border border-vsc-line bg-vsc-sidebar px-3 py-1.5 text-[12px] text-vsc-muted">{info}</div>}
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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          />
          {!graph.nodes.length && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-[13px] text-vsc-muted">
              Пусто. Нажми «Собрать мозг» — ИИ прочитает задачи, заметки, календарь, почту и Notion и построит граф. Или добавь узлы вручную.
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
