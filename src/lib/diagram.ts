"use client";

/**
 * Data model + geometry for the block-diagram editor (a small, dependency-free
 * engine in the spirit of boardmix/Miro). Everything renders as SVG; these
 * helpers compute node borders, edge routing and an export-ready SVG string.
 */

export type ShapeKind = "rect" | "round" | "diamond" | "ellipse";

export interface DiagNode {
  id: string;
  x: number; // top-left, world coords
  y: number;
  w: number;
  h: number;
  text: string;
  shape: ShapeKind;
  fill: string; // palette key (see PALETTE) or "" for default
  stroke: string;
  textColor: string;
}

export interface DiagEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  arrow?: boolean; // arrowhead at target (default true)
}

export interface DiagramData {
  nodes: DiagNode[];
  edges: DiagEdge[];
}

export interface Diagram {
  id: string;
  title: string;
  data: DiagramData;
  updated_at: string;
  created_at: string;
}

/* ---- palette ---------------------------------------------------------- */
/** Fill / stroke / text swatches tuned to read on the dark IDE canvas. */
export interface Swatch { key: string; label: string; fill: string; stroke: string; text: string }

export const PALETTE: Swatch[] = [
  { key: "", label: "Стандарт", fill: "#2a2d2e", stroke: "#5a5d5e", text: "#e6e6e6" },
  { key: "blue", label: "Синий", fill: "#1e3a5f", stroke: "#4a90e2", text: "#dcefff" },
  { key: "green", label: "Зелёный", fill: "#1e4032", stroke: "#4caf50", text: "#d8f5e3" },
  { key: "purple", label: "Фиолет", fill: "#3a2a5f", stroke: "#a06cf0", text: "#eee0ff" },
  { key: "red", label: "Красный", fill: "#4a2020", stroke: "#e05555", text: "#ffe0e0" },
  { key: "amber", label: "Янтарь", fill: "#4a3a10", stroke: "#e0a838", text: "#fff3d8" },
  { key: "teal", label: "Бирюза", fill: "#123f42", stroke: "#38c0c8", text: "#d8f7fa" },
];

export function swatch(key: string): Swatch {
  return PALETTE.find((s) => s.key === key) ?? PALETTE[0];
}

export const GRID = 8;
export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function uid(prefix = "n"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ---- geometry --------------------------------------------------------- */

export interface Pt { x: number; y: number }

export function nodeCenter(n: DiagNode): Pt {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

/** Point on the node's border along the ray from its center toward `target`. */
export function borderPoint(n: DiagNode, target: Pt): Pt {
  const c = nodeCenter(n);
  const dx = target.x - c.x;
  const dy = target.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const hw = n.w / 2;
  const hh = n.h / 2;

  if (n.shape === "ellipse") {
    // Parametric ellipse edge in the direction of (dx,dy).
    const t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
    return { x: c.x + dx * t, y: c.y + dy * t };
  }
  if (n.shape === "diamond") {
    // |x|/hw + |y|/hh = 1
    const t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    return { x: c.x + dx * t, y: c.y + dy * t };
  }
  // rect / round: clamp to the bounding box.
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

export function edgeEnds(from: DiagNode, to: DiagNode): { a: Pt; b: Pt } {
  return { a: borderPoint(from, nodeCenter(to)), b: borderPoint(to, nodeCenter(from)) };
}

/** Bounding box of all nodes (for export / fit-to-view), with padding. */
export function contentBounds(nodes: DiagNode[], pad = 40): { x: number; y: number; w: number; h: number } {
  if (!nodes.length) return { x: 0, y: 0, w: 400, h: 300 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

/* ---- SVG export ------------------------------------------------------- */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function shapeSvg(n: DiagNode): string {
  const s = swatch(n.fill);
  const fill = s.fill;
  const stroke = swatch(n.stroke || n.fill).stroke;
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="2"`;
  if (n.shape === "ellipse") return `<ellipse cx="${n.x + n.w / 2}" cy="${n.y + n.h / 2}" rx="${n.w / 2}" ry="${n.h / 2}" ${common}/>`;
  if (n.shape === "diamond") {
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    const pts = `${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}`;
    return `<polygon points="${pts}" ${common}/>`;
  }
  const rx = n.shape === "round" ? 10 : 0;
  return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${rx}" ${common}/>`;
}

function textSvg(n: DiagNode): string {
  const color = swatch(n.fill).text;
  const cx = n.x + n.w / 2;
  const lines = wrapText(n.text, n.w - 16);
  const lh = 18;
  const startY = n.y + n.h / 2 - ((lines.length - 1) * lh) / 2 + 5;
  return lines
    .map((ln, i) => `<text x="${cx}" y="${startY + i * lh}" fill="${color}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" text-anchor="middle">${esc(ln)}</text>`)
    .join("");
}

/** Naive word-wrap by an approximate glyph width (export only). */
export function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const perChar = 7.5;
  const maxChars = Math.max(6, Math.floor(maxWidth / perChar));
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && (line.length + 1 + w.length) > maxChars) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 8);
}

export function toSvgString(data: DiagramData, bg = "#1e1e1e"): string {
  const b = contentBounds(data.nodes);
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const edges = data.edges
    .map((e) => {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      if (!from || !to) return "";
      const { a, b: bb } = edgeEnds(from, to);
      const stroke = "#8a8d8e";
      const dash = e.dashed ? ` stroke-dasharray="6 5"` : "";
      const marker = e.arrow === false ? "" : ` marker-end="url(#arrow)"`;
      const label = e.label
        ? `<text x="${(a.x + bb.x) / 2}" y="${(a.y + bb.y) / 2 - 5}" fill="#c8c8c8" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" text-anchor="middle">${esc(e.label)}</text>`
        : "";
      return `<line x1="${a.x}" y1="${a.y}" x2="${bb.x}" y2="${bb.y}" stroke="${stroke}" stroke-width="2"${dash}${marker}/>${label}`;
    })
    .join("");
  const nodes = data.nodes.map((n) => shapeSvg(n) + textSvg(n)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8a8d8e"/></marker></defs>
<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${bg}"/>
${edges}
${nodes}
</svg>`;
}

/* ---- demo ------------------------------------------------------------- */

export const DEMO_DIAGRAMS: Diagram[] = [
  {
    id: "demo-flow",
    title: "Пример: пайплайн деплоя",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      nodes: [
        { id: "a", x: 80, y: 80, w: 160, h: 60, text: "git push", shape: "round", fill: "blue", stroke: "blue", textColor: "" },
        { id: "b", x: 320, y: 80, w: 160, h: 60, text: "CI: тесты", shape: "round", fill: "amber", stroke: "amber", textColor: "" },
        { id: "c", x: 320, y: 220, w: 160, h: 80, text: "Прошли?", shape: "diamond", fill: "purple", stroke: "purple", textColor: "" },
        { id: "d", x: 560, y: 220, w: 160, h: 60, text: "Deploy на Vercel", shape: "round", fill: "green", stroke: "green", textColor: "" },
        { id: "e", x: 80, y: 220, w: 160, h: 60, text: "Откат / фикс", shape: "round", fill: "red", stroke: "red", textColor: "" },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", arrow: true },
        { id: "e2", from: "b", to: "c", arrow: true },
        { id: "e3", from: "c", to: "d", label: "да", arrow: true },
        { id: "e4", from: "c", to: "e", label: "нет", arrow: true, dashed: true },
      ],
    },
  },
];

export function emptyDiagramData(): DiagramData {
  return { nodes: [], edges: [] };
}

export function newNodeAt(x: number, y: number): DiagNode {
  return { id: uid(), x: snap(x - 80), y: snap(y - 30), w: 160, h: 60, text: "Блок", shape: "round", fill: "", stroke: "", textColor: "" };
}
