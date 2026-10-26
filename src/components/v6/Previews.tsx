"use client";

import { motion } from "framer-motion";

/**
 * Small coded illustrations of each project's UI for the cards: no screenshots to go stale,
 * they follow the theme and animate on hover (the parent card has the `group` class).
 */
type P = { a: string; b: string };

const box = "absolute inset-0 flex items-center justify-center";
const panel = "rounded-md border border-white/15 bg-black/25 backdrop-blur-sm";

function RepoJanitor({ a, b }: P) {
  const bars = [92, 78, 64, 88, 55, 81];
  return (
    <div className={`${box} gap-5`}>
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3.5" />
          <motion.circle
            cx="18" cy="18" r="15" fill="none" stroke={a} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray="94.2" initial={{ strokeDashoffset: 94.2 }} whileInView={{ strokeDashoffset: 14 }}
            viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">A</span>
      </div>
      <div className="flex h-14 items-end gap-1.5">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.07, duration: 0.6 }}
            className="w-2.5 rounded-sm transition-transform group-hover:scale-y-110"
            style={{ background: i % 2 ? b : a, transformOrigin: "bottom" }}
          />
        ))}
      </div>
    </div>
  );
}

function JobSearch({ a, b }: P) {
  const rows = [92, 81, 67];
  return (
    <div className={`${box} flex-col gap-1.5 px-6`}>
      {rows.map((s, i) => (
        <div
          key={i}
          className={`${panel} flex w-full max-w-[230px] items-center gap-2 px-2.5 py-1.5 transition-transform duration-500 group-hover:translate-x-1`}
          style={{ transitionDelay: `${i * 60}ms` }}
        >
          <span className="h-4 w-4 rounded" style={{ background: i ? b : a }} />
          <span className="h-1.5 flex-1 rounded bg-white/40" />
          <span className="rounded px-1.5 text-[10px] font-semibold text-white" style={{ background: `${a}aa` }}>
            {s}
          </span>
        </div>
      ))}
    </div>
  );
}

function Hephaestus({ a, b }: P) {
  const nodes = [
    [20, 50], [50, 25], [50, 75], [80, 50],
  ];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full p-3">
      {[[0, 1], [0, 2], [1, 3], [2, 3]].map(([f, t], i) => (
        <motion.line
          key={i}
          x1={nodes[f][0]} y1={nodes[f][1]} x2={nodes[t][0]} y2={nodes[t][1]}
          stroke="rgba(255,255,255,.45)" strokeWidth="0.8" strokeDasharray="3 2"
          animate={{ strokeDashoffset: [0, -10] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      ))}
      {nodes.map(([x, y], i) => (
        <g key={i} className="transition-transform duration-500 group-hover:scale-105" style={{ transformOrigin: `${x}px ${y}px` }}>
          <rect x={x - 9} y={y - 6} width="18" height="12" rx="3" fill={i % 3 ? b : a} />
          <circle cx={x - 4} cy={y} r="1.6" fill="white" />
          <rect x={x - 1} y={y - 1} width="7" height="2" rx="1" fill="rgba(255,255,255,.8)" />
        </g>
      ))}
    </svg>
  );
}

function Yasen({ a, b }: P) {
  // Isometric wardrobe with an opening door on hover.
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full p-2">
      <polygon points="30,30 55,20 75,30 50,40" fill={b} opacity=".9" />
      <polygon points="30,30 50,40 50,85 30,75" fill={a} />
      <polygon points="50,40 75,30 75,75 50,85" fill={a} opacity=".75" />
      <line x1="62.5" y1="35" x2="62.5" y2="80" stroke="rgba(0,0,0,.25)" strokeWidth=".8" />
      <g className="origin-[50px_62px] transition-transform duration-700 group-hover:[transform:skewY(-8deg)_scaleX(.75)]">
        <polygon points="50,40 62.5,35 62.5,80 50,85" fill={a} opacity=".95" />
        <circle cx="60" cy="58" r="1" fill="white" />
      </g>
      <polygon points="15,85 50,100 90,82 55,70" fill="rgba(255,255,255,.08)" />
    </svg>
  );
}

function Physlab({ a, b }: P) {
  const bodies = [
    { x: 18, s: 9, d: 0, c: a, r: true },
    { x: 38, s: 7, d: 0.4, c: b, r: false },
    { x: 58, s: 11, d: 0.8, c: a, r: false },
    { x: 78, s: 8, d: 0.2, c: b, r: true },
  ];
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
      <rect x="5" y="88" width="90" height="2" rx="1" fill="rgba(255,255,255,.4)" />
      {bodies.map((o, i) => (
        <motion.g
          key={i}
          animate={{ y: [-40, 86 - o.s, 86 - o.s - 14, 86 - o.s] }}
          transition={{ duration: 1.6, delay: o.d, repeat: Infinity, repeatDelay: 1.4, times: [0, 0.55, 0.75, 1], ease: "easeIn" }}
        >
          {o.r ? (
            <rect x={o.x - o.s / 2} y={0} width={o.s} height={o.s} rx="1.5" fill={o.c} />
          ) : (
            <circle cx={o.x} cy={o.s / 2} r={o.s / 2} fill={o.c} />
          )}
        </motion.g>
      ))}
    </svg>
  );
}

function Readme({ a, b }: P) {
  return (
    <div className={`${box} gap-3 px-5`}>
      <div className={`${panel} w-28 space-y-1.5 p-2`}>
        {[a, b, "rgba(255,255,255,.5)", a].map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-[8px] text-white/50">⋮⋮</span>
            <span className="h-2 flex-1 rounded-sm" style={{ background: c }} />
          </div>
        ))}
      </div>
      <div className={`${panel} w-32 p-2 transition-transform duration-500 group-hover:-translate-y-1`}>
        <div className="mx-auto h-2 w-16 rounded bg-white/80" />
        <div className="mx-auto mt-1 h-1 w-20 rounded bg-white/40" />
        <div className="mt-2 flex justify-center gap-1">
          {[a, b, "#22c55e"].map((c) => (
            <span key={c} className="h-2.5 w-7 rounded-sm" style={{ background: c }} />
          ))}
        </div>
        <div className="mt-2 h-6 rounded-sm" style={{ background: `linear-gradient(90deg, ${a}, ${b})` }} />
      </div>
    </div>
  );
}

function Argus({ a, b }: P) {
  const msgs = [
    { c: a, w: "70%", r: false },
    { c: b, w: "55%", r: true },
    { c: "#f59e0b", w: "62%", r: false },
  ];
  return (
    <div className={`${box} flex-col gap-1.5 px-6`}>
      {msgs.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: m.r ? 10 : -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.25 }}
          className={`flex w-full max-w-[220px] items-center gap-1.5 ${m.r ? "flex-row-reverse" : ""}`}
        >
          <span className="h-5 w-5 shrink-0 rounded-full ring-2 ring-white/20" style={{ background: m.c }} />
          <span className={`${panel} h-4`} style={{ width: m.w }} />
        </motion.div>
      ))}
    </div>
  );
}

function CyberPath({ a }: P) {
  return (
    <div className={`${box} px-6`}>
      <div className={`${panel} w-full max-w-[230px] p-2.5 font-mono text-[9px] leading-tight text-emerald-300`}>
        <div className="text-white/50">PS C:\&gt; whoami /priv</div>
        <div>SeDebugPrivilege&nbsp;&nbsp;Enabled</div>
        <div className="text-white/50">
          PS C:\&gt; <span className="inline-block h-2.5 w-1.5 translate-y-0.5 animate-pulse bg-emerald-300" />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[8px] text-white/70">
          XP
          <span className="h-1.5 flex-1 overflow-hidden rounded bg-white/15">
            <span className="block h-full w-2/3 rounded transition-all duration-700 group-hover:w-full" style={{ background: a }} />
          </span>
          🏁
        </div>
      </div>
    </div>
  );
}

function PropertyInbox({ a, b }: P) {
  const cols = [3, 2, 1];
  return (
    <div className={`${box} items-start gap-2 pt-5`}>
      {cols.map((n, ci) => (
        <div key={ci} className={`${panel} w-16 space-y-1 p-1.5`}>
          <div className="h-1 w-8 rounded bg-white/50" />
          {Array.from({ length: n }).map((_, i) => (
            <div
              key={i}
              className={`h-4 rounded-sm transition-transform duration-500 ${ci === 0 && i === 0 ? "group-hover:translate-x-[72px]" : ""}`}
              style={{ background: ci === 2 ? b : `${a}cc` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FigmaCopy({ a, b }: P) {
  return (
    <div className={`${box} gap-3`}>
      <div className="relative h-16 w-20 rounded-md border-2 border-dashed border-white/40 p-1.5">
        <span className="absolute -top-3 left-0 text-[8px] text-white/60">Frame</span>
        <div className="h-3 rounded-sm" style={{ background: a }} />
        <div className="mt-1 flex gap-1">
          <div className="h-6 flex-1 rounded-sm" style={{ background: b }} />
          <div className="h-6 flex-1 rounded-sm bg-white/40" />
        </div>
      </div>
      <motion.span
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="text-lg text-white/80"
      >
        →
      </motion.span>
      <div className={`${panel} px-2 py-1.5 font-mono text-[8.5px] leading-snug text-white/80`}>
        <div>
          <span style={{ color: b }}>&lt;div</span> className=
        </div>
        <div className="pl-2" style={{ color: a }}>
          &quot;flex gap-2&quot;
        </div>
        <div>
          <span style={{ color: b }}>&gt;</span>…
        </div>
      </div>
    </div>
  );
}

function Ide({ a, b }: P) {
  return (
    <div className={`${box} px-5`}>
      <div className="w-full max-w-[240px] overflow-hidden rounded-md border border-white/15 bg-[#1e1e1e] shadow-xl transition-transform duration-500 group-hover:scale-[1.03]">
        <div className="flex h-3 items-center gap-1 bg-[#3c3c3c] px-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex h-16">
          <div className="w-3 bg-[#333]" />
          <div className="w-10 space-y-1 bg-[#252526] p-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-1 rounded bg-white/25" />
            ))}
          </div>
          <div className="flex-1 space-y-1 p-1.5">
            <div className="h-1.5 w-2/3 rounded" style={{ background: a }} />
            <div className="h-1 w-full rounded bg-white/25" />
            <div className="h-1 w-5/6 rounded bg-white/25" />
            <div className="h-1 w-1/2 rounded" style={{ background: b }} />
          </div>
        </div>
        <div className="h-2" style={{ background: "#007acc" }} />
      </div>
    </div>
  );
}

const MAP: Record<string, (p: P) => React.ReactElement> = {
  "projects/repo-janitor.ts": RepoJanitor,
  "projects/job-search-tool.ts": JobSearch,
  "projects/hephaestus.ts": Hephaestus,
  "projects/yasen-store.js": Yasen,
  "projects/physlab-3d.js": Physlab,
  "projects/readme-studio.tsx": Readme,
  "projects/argus.ts": Argus,
  "projects/cyberpath.html": CyberPath,
  "projects/property-inbox.tsx": PropertyInbox,
  "projects/figma-copy.tsx": FigmaCopy,
  "projects/personal-workspace.tsx": Ide,
};

export function ProjectPreview({ id, hue }: { id: string; hue: [string, string] }) {
  const C = MAP[id];
  return C ? <C a={hue[0]} b={hue[1]} /> : null;
}
