"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BrainState, BrainNode } from "@/lib/workspace";
import { catColor, isHubId, radius, NOISE } from "./model";

/**
 * Холст «Второго мозга»: физика раскладки, отрисовка, миникарта и вся работа
 * с указателем (drag / pan / zoom / select / связывание кликом).
 *
 * Хук ничего не знает про снапшоты, API и инспектор — он получает граф с
 * весами и отдаёт наружу только события: «выбрали узел», «связали два узла».
 * Позиции/скорости живут вне React, в ref, — кадр анимации не должен
 * триггерить рендер.
 */

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

export interface BrainCanvasOptions {
  /** Граф для отрисовки — уже С достроенными центрами категорий. */
  graph: BrainState;
  weights: Map<string, number>;
  selectedId: string | null;
  /** Режим связывания: id первого узла или null. */
  linkFrom: string | null;
  /** Узлы, попавшие под поиск. null = поиск неактивен. */
  matchedIds: Set<string> | null;
  onSelect: (id: string | null) => void;
  onLink: (from: string, to: string) => void;
}

export function useBrainCanvas({ graph, weights, selectedId, linkFrom, matchedIds, onSelect, onLink }: BrainCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  /** Пересчёт «мир → миникарта» из последнего кадра: нужен, чтобы клик по
   *  миникарте попал ровно туда, куда показывает нарисованная точка. */
  const miniFit = useRef({ s: 1, ox: 0, oy: 0 });
  const bodies = useRef<Bodies>(new Map());
  const view = useRef({ ox: 0, oy: 0, scale: 1 });
  const pointer = useRef({ dragId: null as string | null, panning: false, lastX: 0, lastY: 0, moved: false });
  const hoverRef = useRef<string | null>(null);

  // Всё, что нужно кадру анимации, — через ref: эффект с циклом подписан один
  // раз, а данные и колбэки меняются каждый рендер. Обновляем в эффекте
  // (а не прямо в рендере) — кадр всё равно случится позже.
  const graphRef = useRef(graph);
  const weightsRef = useRef(weights);
  const selectedRef = useRef(selectedId);
  const linkFromRef = useRef(linkFrom);
  const searchRef = useRef(matchedIds);
  const onSelectRef = useRef(onSelect);
  const onLinkRef = useRef(onLink);
  useEffect(() => {
    graphRef.current = graph;
    weightsRef.current = weights;
    selectedRef.current = selectedId;
    linkFromRef.current = linkFrom;
    searchRef.current = matchedIds;
    onSelectRef.current = onSelect;
    onLinkRef.current = onLink;
  });

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

      /* ---- детализация по зуму (LOD) ---------------------------------------
       *
       * Каша возникает на ОБОИХ концах зума, и по разным причинам.
       *
       * Далеко: в кадре весь граф, подписи наезжают друг на друга, линии
       * сливаются в серую сетку. Нужен силуэт — опоры и форма долей, без текста.
       *
       * Близко: ты зашёл внутрь кластера смотреть детали, а опорный узел со
       * своим десятком связей продолжает перечёркивать кадр и подписываться
       * крупным шрифтом. На этом масштабе он уже не ориентир — ориентир тут
       * мелочь, ради которой и приближались. Поэтому тяжёлые гасим зеркально.
       *
       * `far` 0→1: 0 — максимальное отдаление. `deep` 0→1: 1 — упёрлись вплотную.
       */
      const far = Math.min(1, Math.max(0, (scale - 0.42) / 0.28));
      const deep = Math.min(1, Math.max(0, (scale - 1.45) / 0.75));

      // Линии на отдалении гасим целиком: на общем плане важна форма графа, а не
      // каждая связь. Выделенные не трогаем — иначе теряется смысл клика издалека.
      const zoomFade = Math.min(1, Math.max(0.22, (scale - 0.28) / 0.62));

      for (const e of g.edges) {
        const a = map.get(e.from), b = map.get(e.to);
        if (!a || !b) continue;
        const active = sel && (e.from === sel || e.to === sel);
        // Связь весит столько же, сколько её более лёгкий конец: линия между
        // двумя мусорными узлами не должна чертить холст наравне с опорной.
        const ew = Math.min(wmap.get(e.from) ?? 0.5, wmap.get(e.to) ?? 0.5);
        // Вблизи убираем «лучи» опорных узлов: их у хаба десятки, и они
        // перечёркивают ровно то, ради чего приближались. Смотрим по ТЯЖЁЛОМУ
        // концу — именно он разводит лучи веером через весь кадр.
        const heavyEnd = Math.max(wmap.get(e.from) ?? 0.5, wmap.get(e.to) ?? 0.5);
        const deepFade = heavyEnd >= 0.78 ? 1 - deep * 0.8 : 1;
        ctx.strokeStyle = active
          ? "rgba(79,193,255,0.75)"
          : `rgba(140,140,150,${((0.08 + ew * 0.26) * zoomFade * deepFade).toFixed(3)})`;
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
        // Центр категории рисуем кольцом, а не точкой: он не сущность, а место
        // сбора, и не должен выглядеть как узел, который можно открыть.
        if (isHubId(n.id)) {
          ctx.fillStyle = color + "22";
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (hit || n.id === sel || n.id === hover || n.id === linkFromRef.current) {
          ctx.strokeStyle = n.id === linkFromRef.current ? "#dcdcaa" : hit ? "#4fc1ff" : "#ffffff";
          ctx.lineWidth = hit ? 2.2 : 1.6;
          ctx.stroke();
        }
        // Подписи — главный источник каши. Мелочь подписываем только под
        // курсором / в выделении / в поиске, иначе холст забивается текстом.
        if (focused || (nw >= NOISE && !dim)) {
          let la = dim ? 0.3 : focused ? 1 : 0.45 + nw * 0.55;
          // Наведённое и найденное показываем всегда: LOD убирает лишнее, но не
          // должен прятать то, на что человек прямо сейчас смотрит.
          if (!focused) {
            // Далеко — подписаны только опоры, остальное молчит: получается
            // силуэт графа, а не сплошной текст.
            if (nw < 0.8) la *= far;
            // Близко — наоборот, замолкают опоры: их название и так известно,
            // а место на экране нужно деталям.
            if (nw >= 0.78) la *= 1 - deep * 0.9;
          }
          // Ниже этого порога буквы уже нечитаемы и работают как грязь.
          if (la > 0.05) {
            ctx.globalAlpha = la;
            ctx.fillStyle = "rgba(225,225,235,0.95)";
            ctx.font = `${nw >= 0.78 ? "600 12" : nw >= 0.5 ? "11" : "10"}px system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(n.label.slice(0, nw >= 0.5 ? 32 : 20), b.x, b.y + r + 12);
          }
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      /* ---- миникарта ------------------------------------------------------
       * Рисуется тем же кадром: отдельный цикл ради ста точек — лишняя работа,
       * а рассинхрон с основным холстом сразу заметен глазом.
       */
      const mini = miniRef.current;
      if (mini && arr.length) {
        const mctx = mini.getContext("2d");
        const mw = mini.clientWidth, mh = mini.clientHeight;
        if (mctx && mw && mh) {
          const dpr = window.devicePixelRatio || 1;
          if (mini.width !== Math.round(mw * dpr)) {
            mini.width = Math.round(mw * dpr);
            mini.height = Math.round(mh * dpr);
          }
          mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          mctx.clearRect(0, 0, mw, mh);

          // Границы по узлам, а не по холсту: граф уплывает, и карта должна
          // ехать за ним, иначе точки собьются в угол.
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const { b } of arr) {
            if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x;
            if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y;
          }
          const pad = 30;
          const s = Math.min((mw - 8) / Math.max(1, maxX - minX + pad * 2), (mh - 8) / Math.max(1, maxY - minY + pad * 2));
          const ox = 4 - (minX - pad) * s, oy = 4 - (minY - pad) * s;
          miniFit.current = { s, ox, oy };
          const mx = (x: number) => x * s + ox, my = (y: number) => y * s + oy;

          for (const { n, b, w: nw } of arr) {
            const hit = matches?.has(n.id) ?? false;
            // Найденное поиском на карте видно сразу — иначе, чтобы понять, куда
            // ехать за совпадением, пришлось бы возить основной вид наугад.
            const faded = matches ? !hit : false;
            // Связи на миникарте не рисуем вовсе: в таком масштабе они дают
            // сплошную заливку, из которой не читается ничего.
            mctx.globalAlpha = faded ? 0.12 : 0.25 + nw * 0.75;
            mctx.fillStyle = hit ? "#4fc1ff" : catColor(n.category);
            mctx.beginPath();
            mctx.arc(mx(b.x), my(b.y), Math.max(1, (hit ? 2 : 1) + nw * 2.5), 0, Math.PI * 2);
            mctx.fill();
            // Выделенный узел помечаем всегда: это точка отсчёта на карте.
            if (n.id === sel) {
              mctx.globalAlpha = 1;
              mctx.strokeStyle = "#ffffff";
              mctx.lineWidth = 1.2;
              mctx.stroke();
            }
          }
          mctx.globalAlpha = 1;

          // Рамка текущего вида — то, ради чего карта и нужна.
          // Мировые координаты левого верхнего угла экрана — это -offset/scale.
          const vx = mx(-view.current.ox / view.current.scale);
          const vy = my(-view.current.oy / view.current.scale);
          mctx.strokeStyle = "rgba(79,193,255,0.9)";
          mctx.lineWidth = 1;
          mctx.strokeRect(vx, vy, (w / view.current.scale) * s, (h / view.current.scale) * s);
        }
      }

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

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = toWorld(e.clientX, e.clientY);
    const id = nodeAt(x, y);
    pointer.current = { dragId: id, panning: !id, lastX: e.clientX, lastY: e.clientY, moved: false };
  }, [toWorld, nodeAt]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
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
  }, [toWorld, nodeAt]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const p = pointer.current;
    if (!p.moved) {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const id = nodeAt(x, y);
      // Центр категории — не настоящий узел: связь с ним ушла бы в снапшот
      // ссылкой в никуда, поэтому связывание на нём просто не срабатывает.
      if (id && !isHubId(id) && linkFromRef.current && id !== linkFromRef.current) {
        // Режим связывания: второй клик создаёт ребро.
        onLinkRef.current(linkFromRef.current, id);
      } else {
        onSelectRef.current(id);
      }
    }
    pointer.current = { dragId: null, panning: false, lastX: 0, lastY: 0, moved: false };
  }, [toWorld, nodeAt]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const v = view.current;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const next = Math.min(2.5, Math.max(0.35, v.scale * factor));
    // Зум к курсору: точка под мышью остаётся на месте.
    v.ox = mx - ((mx - v.ox) / v.scale) * next;
    v.oy = my - ((my - v.oy) / v.scale) * next;
    v.scale = next;
  }, []);

  /**
   * Прыжок по миникарте: центрируем вид на точке, куда ткнули.
   *
   * Работает и на зажатой кнопке — тащишь по карте, основной вид едет следом.
   * Масштаб при этом не трогаем: карта отвечает на «где я», а не «насколько
   * близко», и внезапный зум под пальцем сбивал бы ориентацию.
   */
  const miniGo = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0 && e.type === "pointermove") return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { s, ox, oy } = miniFit.current;
    if (!s) return;
    const wx = (e.clientX - rect.left - ox) / s;
    const wy = (e.clientY - rect.top - oy) / s;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const v = view.current;
    v.ox = wrap.clientWidth / 2 - wx * v.scale;
    v.oy = wrap.clientHeight / 2 - wy * v.scale;
  }, []);

  /** Навести камеру на узел (центрировать) и выделить его. */
  const focusNode = useCallback((id: string) => {
    const b = bodies.current.get(id);
    const wrap = wrapRef.current;
    if (b && wrap) {
      const { scale } = view.current;
      view.current.ox = wrap.clientWidth / 2 - b.x * scale;
      view.current.oy = wrap.clientHeight / 2 - b.y * scale;
    }
    onSelectRef.current(id);
  }, []);

  /** Текущие координаты узлов — впечатываются в снапшот при сохранении. */
  const positions = useCallback(() => {
    const out = new Map<string, { x: number; y: number }>();
    for (const [id, b] of bodies.current) out.set(id, { x: Math.round(b.x), y: Math.round(b.y) });
    return out;
  }, []);

  /** Сбросить раскладку — при загрузке другого снапшота или пересборке с нуля. */
  const resetBodies = useCallback(() => { bodies.current.clear(); }, []);

  return {
    canvasRef, wrapRef, miniRef,
    canvasHandlers: { onPointerDown, onPointerMove, onPointerUp, onWheel },
    miniGo,
    focusNode,
    positions,
    resetBodies,
  };
}
