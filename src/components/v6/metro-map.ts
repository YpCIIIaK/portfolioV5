/**
 * The metro map of Design 6.0: career and projects as lines and stations.
 * Coordinates are in map units (viewBox 0 0 1500 1000), lines only run at 0°/45°/90°
 * like a real transit diagram. The train's route is the lines joined at their
 * interchanges, in story order: career → web → AI → tools → 3D → "your company".
 */

export type LabelSide = "top" | "bottom" | "left" | "right";

export interface Stop {
  x: number;
  y: number;
  /** Station key; points without one are bends. */
  s?: string;
}

export interface Line {
  id: string;
  ru: string;
  en: string;
  color: string;
  points: Stop[];
  /** Short drawn-only tails beyond the ends, for the transit-map look. */
  stubStart?: [number, number];
  stubEnd?: [number, number];
  dashed?: boolean;
}

export interface Station {
  key: string;
  /** PROJECTS / EXPERIENCE id, or a special page. */
  ref: string;
  ru: string;
  en: string;
  side: LabelSide;
  /** Extra horizontal label shift where a line tail would cross the name. */
  dx?: number;
}

export const LINES: Line[] = [
  {
    id: "career", ru: "Карьера", en: "Career", color: "#f97316",
    stubStart: [40, 150],
    points: [
      { x: 150, y: 150, s: "start" },
      { x: 290, y: 150, s: "paraweb" },
      { x: 430, y: 150, s: "yourtar" },
      { x: 570, y: 150, s: "vortan" },
      { x: 710, y: 150, s: "hrtech" },
      { x: 850, y: 150, s: "factum" },
    ],
  },
  {
    id: "web", ru: "Веб", en: "Web", color: "#3b82f6",
    stubEnd: [1440, 300],
    points: [
      { x: 850, y: 150, s: "factum" },
      { x: 1000, y: 300, s: "portfolio" },
      { x: 1160, y: 300, s: "cyberpath" },
      { x: 1320, y: 300, s: "inbox" },
    ],
  },
  {
    id: "ai", ru: "AI и агенты", en: "AI & agents", color: "#a855f7",
    stubEnd: [800, 600],
    points: [
      { x: 1320, y: 300, s: "inbox" },
      { x: 1320, y: 440, s: "argus" },
      { x: 1160, y: 600, s: "hephaestus" },
      { x: 960, y: 600, s: "jobsearch" },
    ],
  },
  {
    id: "tools", ru: "Инструменты", en: "Dev tools", color: "#10b981",
    stubEnd: [220, 760],
    points: [
      { x: 960, y: 600, s: "jobsearch" },
      { x: 960, y: 690 },
      { x: 890, y: 760, s: "janitor" },
      { x: 640, y: 760, s: "figma" },
      { x: 400, y: 760, s: "readme" },
    ],
  },
  {
    id: "3d", ru: "3D и графика", en: "3D & graphics", color: "#ec4899",
    stubStart: [310, 670],
    points: [
      { x: 400, y: 760, s: "readme" },
      { x: 490, y: 850 },
      { x: 680, y: 850, s: "yasen" },
      { x: 900, y: 850, s: "physlab" },
    ],
  },
  {
    id: "next", ru: "Строится", en: "Under construction", color: "#94a3b8", dashed: true,
    points: [
      { x: 900, y: 850, s: "physlab" },
      { x: 1180, y: 850, s: "you" },
    ],
  },
];

export const STATIONS: Record<string, Station> = {
  start: { key: "start", ref: "start", ru: "Старт", en: "Start", side: "bottom" },
  paraweb: { key: "paraweb", ref: "experience/paraweb.md", ru: "Paraweb", en: "Paraweb", side: "top" },
  yourtar: { key: "yourtar", ref: "experience/telegram-bots.md", ru: "YourTar", en: "YourTar", side: "bottom" },
  vortan: { key: "vortan", ref: "experience/vortan.md", ru: "Vortan", en: "Vortan", side: "top" },
  hrtech: { key: "hrtech", ref: "experience/hr-search-platform.md", ru: "HR-tech", en: "HR-tech", side: "bottom" },
  factum: { key: "factum", ref: "experience/factum.md", ru: "Factum", en: "Factum", side: "top" },
  portfolio: { key: "portfolio", ref: "projects/personal-workspace.tsx", ru: "Portfolio IDE", en: "Portfolio IDE", side: "bottom" },
  cyberpath: { key: "cyberpath", ref: "projects/cyberpath.html", ru: "CyberPath", en: "CyberPath", side: "top" },
  inbox: { key: "inbox", ref: "projects/property-inbox.tsx", ru: "Property Inbox", en: "Property Inbox", side: "top" },
  argus: { key: "argus", ref: "projects/argus.ts", ru: "ARGUS", en: "ARGUS", side: "right" },
  hephaestus: { key: "hephaestus", ref: "projects/hephaestus.ts", ru: "Hephaestus", en: "Hephaestus", side: "bottom" },
  jobsearch: { key: "jobsearch", ref: "projects/job-search-tool.ts", ru: "JobSearchTool", en: "JobSearchTool", side: "top" },
  janitor: { key: "janitor", ref: "projects/repo-janitor.ts", ru: "Repo Janitor", en: "Repo Janitor", side: "bottom" },
  figma: { key: "figma", ref: "projects/figma-copy.tsx", ru: "Figma Copy", en: "Figma Copy", side: "top" },
  readme: { key: "readme", ref: "projects/readme-studio.tsx", ru: "Readme Studio", en: "Readme Studio", side: "top", dx: 64 },
  yasen: { key: "yasen", ref: "projects/yasen-store.js", ru: "Ясень", en: "Yasen", side: "bottom" },
  physlab: { key: "physlab", ref: "projects/physlab-3d.js", ru: "Физлаб 3D", en: "Physlab 3D", side: "bottom" },
  you: { key: "you", ref: "you", ru: "Ваша компания", en: "Your company", side: "bottom" },
};

/** Where the round line-number badge sits: the free end of a line tail. */
export function badgeOf(l: Line): [number, number] | undefined {
  return l.stubStart ?? l.stubEnd;
}

/** Lines each station belongs to (more than one = interchange). */
export function linesAt(key: string): Line[] {
  return LINES.filter((l) => l.points.some((p) => p.s === key));
}

/** The train route: all line points joined, interchange points not repeated. */
export const ROUTE: (Stop & { line: string })[] = LINES.flatMap((l, i) =>
  l.points.slice(i === 0 ? 0 : 1).map((p) => ({ ...p, line: l.id })),
);

/** Cumulative distance along the route for each point. */
const CUM: number[] = ROUTE.reduce<number[]>((acc, p, i) => {
  if (i === 0) return [0];
  const q = ROUTE[i - 1];
  acc.push(acc[i - 1] + Math.hypot(p.x - q.x, p.y - q.y));
  return acc;
}, []);

/** Stations in travel order with their distance along the route. */
export const STOPS = ROUTE.map((p, i) => ({ ...p, d: CUM[i] })).filter((p): p is Stop & { s: string; line: string; d: number } =>
  Boolean(p.s),
);

/** Position, heading and current line at a distance along the route. */
export function pointAt(d: number): { x: number; y: number; angle: number; line: string } {
  const total = CUM[CUM.length - 1];
  const dd = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < CUM.length - 1 && CUM[i] < dd) i++;
  const a = ROUTE[i - 1];
  const b = ROUTE[i];
  const seg = CUM[i] - CUM[i - 1] || 1;
  const t = (dd - CUM[i - 1]) / seg;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    line: b.line,
  };
}

/** Share of each stop's scroll slot the train stands still at the platform. */
export const DWELL = 0.4;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Scroll progress 0..1 → distance along the route and the nearest station index. */
export function travel(progress: number): { d: number; index: number } {
  const n = STOPS.length - 1;
  const u = Math.max(0, Math.min(n, progress * n));
  const i = Math.min(n - 1, Math.floor(u));
  const frac = u - i;
  if (u >= n) return { d: STOPS[n].d, index: n };
  if (frac < DWELL) return { d: STOPS[i].d, index: i };
  const t = ease((frac - DWELL) / (1 - DWELL));
  return { d: STOPS[i].d + (STOPS[i + 1].d - STOPS[i].d) * t, index: t < 0.5 ? i : i + 1 };
}

/** Scroll progress at which the train stands at station `i` (middle of its dwell). */
export function progressOf(i: number): number {
  const n = STOPS.length - 1;
  return i >= n ? 1 : (i + DWELL / 2) / n;
}
