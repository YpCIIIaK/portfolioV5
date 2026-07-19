"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Shapes, Plus, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Download,
  Square, Circle, Diamond, RectangleHorizontal, Spline, FileDown, PencilLine,
} from "lucide-react";
import { useCollection } from "./useCollection";
import { wsCreate, wsUpdate, wsDelete } from "@/lib/workspace";
import {
  type Diagram, type DiagramData, type DiagNode, type DiagEdge, type ShapeKind, type Pt,
  DEMO_DIAGRAMS, PALETTE, swatch, snap, uid, newNodeAt, edgeEnds, nodeCenter, contentBounds, toSvgString,
} from "@/lib/diagram";

/* ====================================================================== */
/*  Panel: diagram document list + editor                                 */
/* ====================================================================== */

export function DiagramPanel() {
  const { items, setItems, loading, readonly, reload } = useCollection<Diagram>("diagrams", DEMO_DIAGRAMS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = items.find((d) => d.id === activeId) ?? items[0] ?? null;

  const createDiagram = useCallback(async () => {
    if (readonly || busy) return;
    setBusy(true);
    try {
      const created = await wsCreate<Diagram>("diagrams", { title: "Новая диаграмма", data: { nodes: [], edges: [] } });
      setItems([created, ...items]);
      setActiveId(created.id);
    } catch {
      /* surfaced by collection error elsewhere */
    } finally {
      setBusy(false);
    }
  }, [readonly, busy, items, setItems]);

  const removeDiagram = useCallback(async (id: string) => {
    if (readonly) return;
    const next = items.filter((d) => d.id !== id);
    setItems(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    try { await wsDelete("diagrams", id); } catch { reload(); }
  }, [readonly, items, activeId, setItems, reload]);

  const persist = useCallback((id: string, patch: Partial<Pick<Diagram, "title" | "data">>) => {
    setItems(items.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    if (readonly) return;
    wsUpdate("diagrams", id, patch as Record<string, unknown>).catch(() => {});
  }, [readonly, items, setItems]);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-3 px-4 py-4">
      {/* document list */}
      <aside className="flex w-52 shrink-0 flex-col rounded-lg border border-vsc-line bg-vsc-sidebar">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-vsc-bright"><Shapes size={15} /> Диаграммы</span>
          <button onClick={createDiagram} disabled={readonly || busy} title="Новая диаграмма" className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text disabled:opacity-40"><Plus size={15} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {loading ? (
            <p className="px-2 py-1 text-[12px] text-vsc-muted">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-2 text-[12px] leading-relaxed text-vsc-muted">Пусто. {readonly ? "Войди, чтобы создавать доски." : "Нажми + для новой доски."}</p>
          ) : (
            items.map((d) => (
              <div key={d.id} className={`group flex items-center gap-1 rounded px-2 py-1.5 ${active?.id === d.id ? "bg-vsc-hover" : "hover:bg-vsc-hover"}`}>
                <button onClick={() => setActiveId(d.id)} className="min-w-0 flex-1 truncate text-left text-[13px] text-vsc-text">{d.title || "Без названия"}</button>
                {!readonly && (
                  <button onClick={() => removeDiagram(d.id)} title="Удалить" className="shrink-0 rounded p-0.5 text-vsc-muted opacity-0 hover:text-vsc-red group-hover:opacity-100"><Trash2 size={13} /></button>
                )}
              </div>
            ))
          )}
        </div>
        {readonly && <p className="px-3 py-2 text-[11px] leading-relaxed text-vsc-muted">Демо-режим: изменения не сохраняются.</p>}
      </aside>

      {/* editor */}
      <div className="min-w-0 flex-1">
        {active ? (
          <DiagramEditor
            key={active.id}
            diagram={active}
            readonly={readonly}
            onData={(data) => persist(active.id, { data })}
            onTitle={(title) => persist(active.id, { title })}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-vsc-line text-[13px] text-vsc-muted">
            Выбери или создай диаграмму
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Editor: the canvas engine                                             */
/* ====================================================================== */

interface View { x: number; y: number; z: number }
type Sel = { kind: "node"; id: string } | { kind: "edge"; id: string } | null;
type Drag =
  | { mode: "none" }
  | { mode: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { mode: "move"; id: string; dx: number; dy: number; moved: boolean; snap0: DiagramData }
  | { mode: "connect"; from: string; cur: Pt };

const clampZoom = (z: number) => Math.min(2.5, Math.max(0.2, z));

function DiagramEditor({ diagram, readonly, onData, onTitle }: {
  diagram: Diagram;
  readonly: boolean;
  onData: (d: DiagramData) => void;
  onTitle: (t: string) => void;
}) {
  const [data, setData] = useState<DiagramData>(diagram.data);
  const [view, setView] = useState<View>({ x: 40, y: 40, z: 1 });
  const [sel, setSel] = useState<Sel>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [saved, setSaved] = useState(true);
  const [connect, setConnect] = useState<{ from: string; cur: Pt } | null>(null);
  const [panning, setPanning] = useState(false);

  const past = useRef<DiagramData[]>([]);
  const future = useRef<DiagramData[]>([]);
  const drag = useRef<Drag>({ mode: "none" });
  const svgRef = useRef<SVGSVGElement>(null);
  const skipSave = useRef(true); // don't autosave the initial load

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  /* ---- autosave (debounced) ---- */
  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return; }
    setSaved(false);
    const t = setTimeout(() => { onData(data); setSaved(true); }, 700);
    return () => clearTimeout(t);
  }, [data, onData]);

  /* ---- history-aware mutation ---- */
  const commit = useCallback((next: DiagramData) => {
    past.current.push(data);
    if (past.current.length > 80) past.current.shift();
    future.current = [];
    setData(next);
  }, [data]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(data);
    setData(prev);
  }, [data]);
  const redo = useCallback(() => {
    const nxt = future.current.pop();
    if (!nxt) return;
    past.current.push(data);
    setData(nxt);
  }, [data]);

  /* ---- coordinate helpers ---- */
  const toWorld = useCallback((clientX: number, clientY: number): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.z, y: (clientY - r.top - view.y) / view.z };
  }, [view]);

  const patchNode = useCallback((id: string, patch: Partial<DiagNode>, history = true) => {
    const next = { ...data, nodes: data.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
    if (history) commit(next); else setData(next);
  }, [data, commit]);

  /* ---- node create ---- */
  const addNode = useCallback((world?: Pt) => {
    if (readonly) return;
    const r = svgRef.current!.getBoundingClientRect();
    const center = world ?? toWorld(r.left + r.width / 2, r.top + r.height / 2);
    const n = newNodeAt(center.x, center.y);
    commit({ ...data, nodes: [...data.nodes, n] });
    setSel({ kind: "node", id: n.id });
    setEditing(n.id);
  }, [readonly, data, commit, toWorld]);

  /* ---- delete ---- */
  const deleteSel = useCallback(() => {
    if (readonly || !sel) return;
    if (sel.kind === "node") {
      commit({ nodes: data.nodes.filter((n) => n.id !== sel.id), edges: data.edges.filter((e) => e.from !== sel.id && e.to !== sel.id) });
    } else {
      commit({ ...data, edges: data.edges.filter((e) => e.id !== sel.id) });
    }
    setSel(null);
  }, [readonly, sel, data, commit]);

  /* ---- pointer interactions ---- */
  const onPointerDownBg = (e: React.PointerEvent) => {
    if (editing) return;
    setSel(null);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    setPanning(true);
  };

  const onPointerDownNode = (e: React.PointerEvent, n: DiagNode) => {
    e.stopPropagation();
    if (editing) return;
    setSel({ kind: "node", id: n.id });
    if (readonly) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);
    drag.current = { mode: "move", id: n.id, dx: w.x - n.x, dy: w.y - n.y, moved: false, snap0: data };
  };

  const onPointerDownHandle = (e: React.PointerEvent, n: DiagNode) => {
    e.stopPropagation();
    if (readonly) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const cur = toWorld(e.clientX, e.clientY);
    drag.current = { mode: "connect", from: n.id, cur };
    setConnect({ from: n.id, cur });
    setSel({ kind: "node", id: n.id });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d.mode === "pan") {
      setView((v) => ({ ...v, x: d.vx + (e.clientX - d.sx), y: d.vy + (e.clientY - d.sy) }));
    } else if (d.mode === "move") {
      const w = toWorld(e.clientX, e.clientY);
      drag.current = { ...d, moved: true };
      patchNode(d.id, { x: snap(w.x - d.dx), y: snap(w.y - d.dy) }, false);
    } else if (d.mode === "connect") {
      const cur = toWorld(e.clientX, e.clientY);
      drag.current = { ...d, cur };
      setConnect({ from: d.from, cur });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d.mode === "move" && d.moved) {
      // Push the pre-move snapshot so one undo reverts the whole drag.
      past.current.push(d.snap0);
      if (past.current.length > 80) past.current.shift();
      future.current = [];
    } else if (d.mode === "connect") {
      const w = toWorld(e.clientX, e.clientY);
      const target = [...data.nodes].reverse().find((n) => w.x >= n.x && w.x <= n.x + n.w && w.y >= n.y && w.y <= n.y + n.h);
      if (target && target.id !== d.from) {
        const exists = data.edges.some((ed) => ed.from === d.from && ed.to === target.id);
        if (!exists) {
          const edge: DiagEdge = { id: uid("e"), from: d.from, to: target.id, arrow: true };
          commit({ ...data, edges: [...data.edges, edge] });
        }
      }
    }
    drag.current = { mode: "none" };
    setConnect(null);
    setPanning(false);
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    setView((v) => {
      const z = clampZoom(v.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
      // keep the point under the cursor fixed while zooming
      const wx = (mx - v.x) / v.z;
      const wy = (my - v.y) / v.z;
      return { z, x: mx - wx * z, y: my - wy * z };
    });
  };

  const fit = useCallback(() => {
    const r = svgRef.current!.getBoundingClientRect();
    const b = contentBounds(data.nodes, 60);
    const z = clampZoom(Math.min(r.width / b.w, r.height / b.h));
    setView({ z, x: (r.width - b.w * z) / 2 - b.x * z, y: (r.height - b.h * z) / 2 - b.y * z });
  }, [data.nodes]);

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || titleEditing) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteSel(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, titleEditing, sel, deleteSel, undo, redo]);

  /* ---- style application (selected node or applies on create) ---- */
  const selNode = sel?.kind === "node" ? byId.get(sel.id) ?? null : null;
  const selEdge = sel?.kind === "edge" ? data.edges.find((e) => e.id === sel.id) ?? null : null;

  const applyShape = (shape: ShapeKind) => { if (selNode && !readonly) patchNode(selNode.id, { shape }); };
  const applyFill = (fill: string) => { if (selNode && !readonly) patchNode(selNode.id, { fill, stroke: fill }); };
  const toggleDashed = () => { if (selEdge && !readonly) commit({ ...data, edges: data.edges.map((e) => e.id === selEdge.id ? { ...e, dashed: !e.dashed } : e) }); };
  const toggleArrow = () => { if (selEdge && !readonly) commit({ ...data, edges: data.edges.map((e) => e.id === selEdge.id ? { ...e, arrow: e.arrow === false } : e) }); };

  /* ---- export ---- */
  const download = (name: string, href: string) => {
    const a = document.createElement("a");
    a.href = href; a.download = name; a.click();
  };
  const exportSvg = () => {
    const svg = toSvgString(data);
    download(`${diagram.title || "diagram"}.svg`, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  };
  const exportPng = () => {
    const svg = toSvgString(data);
    const b = contentBounds(data.nodes);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const c = document.createElement("canvas");
      c.width = b.w * scale; c.height = b.h * scale;
      const ctx = c.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      download(`${diagram.title || "diagram"}.png`, c.toDataURL("image/png"));
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-vsc-line bg-vsc-bg">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-vsc-line px-2 py-1.5">
        {titleEditing ? (
          <input autoFocus defaultValue={diagram.title} onBlur={(e) => { setTitleEditing(false); if (!readonly) onTitle(e.target.value.trim() || "Без названия"); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-44 rounded border border-vsc-line bg-vsc-sidebar px-2 py-1 text-[13px] text-vsc-text outline-none focus:border-vsc-accent" />
        ) : (
          <button onClick={() => !readonly && setTitleEditing(true)} className="flex items-center gap-1 rounded px-2 py-1 text-[13px] font-semibold text-vsc-bright hover:bg-vsc-hover" title="Переименовать">
            {diagram.title || "Без названия"} {!readonly && <PencilLine size={12} className="text-vsc-muted" />}
          </button>
        )}

        <Sep />
        <TBtn title="Добавить блок" onClick={() => addNode()} disabled={readonly}><Plus size={15} /></TBtn>
        <TBtn title="Прямоугольник" onClick={() => applyShape("rect")} active={selNode?.shape === "rect"} disabled={readonly || !selNode}><Square size={15} /></TBtn>
        <TBtn title="Скруглённый" onClick={() => applyShape("round")} active={selNode?.shape === "round"} disabled={readonly || !selNode}><RectangleHorizontal size={15} /></TBtn>
        <TBtn title="Ромб" onClick={() => applyShape("diamond")} active={selNode?.shape === "diamond"} disabled={readonly || !selNode}><Diamond size={15} /></TBtn>
        <TBtn title="Эллипс" onClick={() => applyShape("ellipse")} active={selNode?.shape === "ellipse"} disabled={readonly || !selNode}><Circle size={15} /></TBtn>

        <Sep />
        {PALETTE.map((s) => (
          <button key={s.key || "default"} title={s.label} onClick={() => applyFill(s.key)} disabled={readonly || !selNode}
            className={`h-5 w-5 shrink-0 rounded border disabled:opacity-40 ${selNode?.fill === s.key ? "ring-2 ring-vsc-accent" : ""}`}
            style={{ backgroundColor: s.fill, borderColor: s.stroke }} />
        ))}

        <Sep />
        <TBtn title="Пунктир связи" onClick={toggleDashed} active={!!selEdge?.dashed} disabled={readonly || !selEdge}><Spline size={15} /></TBtn>
        <TBtn title="Стрелка" onClick={toggleArrow} active={selEdge ? selEdge.arrow !== false : false} disabled={readonly || !selEdge}>→</TBtn>
        <TBtn title="Удалить (Del)" onClick={deleteSel} disabled={readonly || !sel}><Trash2 size={15} /></TBtn>

        <Sep />
        <TBtn title="Отменить (Ctrl+Z)" onClick={undo} disabled={readonly}><Undo2 size={15} /></TBtn>
        <TBtn title="Повторить (Ctrl+Shift+Z)" onClick={redo} disabled={readonly}><Redo2 size={15} /></TBtn>

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-[11px] text-vsc-muted">{saved ? "сохранено" : "…"}</span>
          <TBtn title="Уменьшить" onClick={() => setView((v) => ({ ...v, z: clampZoom(v.z / 1.1) }))}><ZoomOut size={15} /></TBtn>
          <span className="w-9 text-center text-[11px] text-vsc-muted">{Math.round(view.z * 100)}%</span>
          <TBtn title="Увеличить" onClick={() => setView((v) => ({ ...v, z: clampZoom(v.z * 1.1) }))}><ZoomIn size={15} /></TBtn>
          <TBtn title="Вписать" onClick={fit}><Maximize size={15} /></TBtn>
          <TBtn title="Экспорт SVG" onClick={exportSvg}><FileDown size={15} /></TBtn>
          <TBtn title="Экспорт PNG" onClick={exportPng}><Download size={15} /></TBtn>
        </div>
      </div>

      {/* canvas */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          className="h-full w-full touch-none select-none"
          style={{ cursor: panning ? "grabbing" : "default" }}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          onDoubleClick={(e) => { if (!readonly && (e.target as Element).tagName === "svg") addNode(toWorld(e.clientX, e.clientY)); }}
        >
          <defs>
            <pattern id="grid" width={16} height={16} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x},${view.y}) scale(${view.z})`}>
              <path d="M16 0 L0 0 0 16" fill="none" stroke="#2b2b2b" strokeWidth="1" />
            </pattern>
            <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#8a8d8e" />
            </marker>
          </defs>
          <rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

          <g transform={`translate(${view.x},${view.y}) scale(${view.z})`}>
            {/* edges */}
            {data.edges.map((e) => {
              const from = byId.get(e.from); const to = byId.get(e.to);
              if (!from || !to) return null;
              const { a, b } = edgeEnds(from, to);
              const isSel = sel?.kind === "edge" && sel.id === e.id;
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              return (
                <g key={e.id} onPointerDown={(ev) => { ev.stopPropagation(); setSel({ kind: "edge", id: e.id }); }} style={{ cursor: "pointer" }}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={isSel ? "#4a90e2" : "#8a8d8e"} strokeWidth={2}
                    strokeDasharray={e.dashed ? "6 5" : undefined}
                    markerEnd={e.arrow === false ? undefined : "url(#arrowhead)"} />
                  {e.label && <text x={mid.x} y={mid.y - 6} fill="#c8c8c8" fontSize={12} textAnchor="middle">{e.label}</text>}
                </g>
              );
            })}

            {/* connect preview */}
            {connect && byId.get(connect.from) && (() => {
              const a = nodeCenter(byId.get(connect.from)!);
              return <line x1={a.x} y1={a.y} x2={connect.cur.x} y2={connect.cur.y} stroke="#4a90e2" strokeWidth={2} strokeDasharray="4 4" pointerEvents="none" />;
            })()}

            {/* nodes */}
            {data.nodes.map((n) => (
              <NodeView key={n.id} n={n}
                selected={sel?.kind === "node" && sel.id === n.id}
                readonly={readonly}
                onPointerDown={(e) => onPointerDownNode(e, n)}
                onHandleDown={(e) => onPointerDownHandle(e, n)}
                onDoubleClick={(e) => { e.stopPropagation(); if (!readonly) setEditing(n.id); }} />
            ))}
          </g>
        </svg>

        {/* inline text editor overlay */}
        {editing && byId.get(editing) && (
          <NodeTextEditor node={byId.get(editing)!} view={view}
            onCommit={(text) => { patchNode(editing, { text }); setEditing(null); }}
            onCancel={() => setEditing(null)} />
        )}

        {/* hint */}
        {data.nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-[13px] text-vsc-muted">Двойной клик по холсту — новый блок. Тяни за кружок на блоке — связь.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- node rendering --------------------------------------------------- */

function NodeView({ n, selected, readonly, onPointerDown, onHandleDown, onDoubleClick }: {
  n: DiagNode; selected: boolean; readonly: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onHandleDown: (e: React.PointerEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}) {
  const s = swatch(n.fill);
  const stroke = selected ? "#4a90e2" : swatch(n.stroke || n.fill).stroke;
  const common = { fill: s.fill, stroke, strokeWidth: selected ? 2.5 : 2 };
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;

  return (
    <g onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} style={{ cursor: readonly ? "default" : "move" }}>
      {n.shape === "ellipse" ? (
        <ellipse cx={cx} cy={cy} rx={n.w / 2} ry={n.h / 2} {...common} />
      ) : n.shape === "diamond" ? (
        <polygon points={`${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}`} {...common} />
      ) : (
        <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.shape === "round" ? 10 : 0} {...common} />
      )}
      <foreignObject x={n.x} y={n.y} width={n.w} height={n.h} pointerEvents="none">
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px", boxSizing: "border-box", color: s.text, fontSize: 14, lineHeight: 1.25, textAlign: "center", wordBreak: "break-word", overflow: "hidden", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
          {n.text}
        </div>
      </foreignObject>

      {/* connect handles (only when selected & editable) */}
      {selected && !readonly && [
        { x: cx, y: n.y }, { x: n.x + n.w, y: cy }, { x: cx, y: n.y + n.h }, { x: n.x, y: cy },
      ].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill="#1e1e1e" stroke="#4a90e2" strokeWidth={2}
          style={{ cursor: "crosshair" }} onPointerDown={onHandleDown} />
      ))}
    </g>
  );
}

function NodeTextEditor({ node, view, onCommit, onCancel }: {
  node: DiagNode; view: View; onCommit: (t: string) => void; onCancel: () => void;
}) {
  const [val, setVal] = useState(node.text);
  const left = node.x * view.z + view.x;
  const top = node.y * view.z + view.y;
  return (
    <textarea
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onCommit(val); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      onFocus={(e) => e.target.select()}
      style={{
        position: "absolute", left, top, width: node.w * view.z, height: node.h * view.z,
        transform: "none", resize: "none", textAlign: "center",
        background: "#252526", color: "#e6e6e6", border: "2px solid #4a90e2", borderRadius: 8,
        fontSize: 14 * view.z, padding: 6, outline: "none", boxSizing: "border-box",
      }}
    />
  );
}

/* ---- toolbar bits ----------------------------------------------------- */

function TBtn({ children, title, onClick, active, disabled }: { children: React.ReactNode; title: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[13px] ${active ? "bg-vsc-accent text-white" : "text-vsc-text hover:bg-vsc-hover"} disabled:opacity-40 disabled:hover:bg-transparent`}>
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px bg-vsc-line" />;
}
