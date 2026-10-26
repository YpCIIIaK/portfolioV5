"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ChevronLeft, ChevronRight, FileText, FolderGit2, Map as MapIcon, Maximize2, MonitorPlay, Send, Volume2, VolumeX } from "lucide-react";
import { AVAILABILITY, EXPERIENCE, PROJECTS, SUMMARY } from "@/lib/profile";
import { track } from "@/lib/track";
import { setDesign } from "@/lib/design";
import { Chip, useL } from "./ui";
import { ProjectPreview } from "./Previews";
import { META, ProjectModal, demoOf, type Project } from "./ProjectModal";
import { LINES, ROUTE, STATIONS, STOPS, badgeOf, linesAt, pointAt, progressOf, travel, type LabelSide } from "./metro-map";
import { scrollToSection } from "./Showcase";

const MAP_W = 1500;
const MAP_H = 1000;
const ROUTE_D = ROUTE.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
const ROUTE_LEN = STOPS[STOPS.length - 1].d;
const lineColor = (id: string) => LINES.find((l) => l.id === id)?.color ?? "#888";

function linePath(l: (typeof LINES)[number]) {
  const pts = [...(l.stubStart ? [{ x: l.stubStart[0], y: l.stubStart[1] }] : []), ...l.points, ...(l.stubEnd ? [{ x: l.stubEnd[0], y: l.stubEnd[1] }] : [])];
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
}

const LABEL_OFFSET: Record<LabelSide, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  top: { dx: 0, dy: -26, anchor: "middle" },
  bottom: { dx: 0, dy: 40, anchor: "middle" },
  left: { dx: -26, dy: 7, anchor: "end" },
  right: { dx: 26, dy: 7, anchor: "start" },
};

const project = (ref: string) => PROJECTS.find((p) => p.id === ref);
const job = (ref: string) => EXPERIENCE.find((j) => j.id === ref);

/** Two-tone arrival chime, synthesized (no audio files). */
let audio: AudioContext | null = null;
function chime() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    [659.25, 523.25].forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.22);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.22 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.5);
      o.connect(g).connect(audio!.destination);
      o.start(t + i * 0.22);
      o.stop(t + i * 0.22 + 0.55);
    });
  } catch {
    /* audio unavailable */
  }
}

/** Scroll the page so the train stands at station `i`. */
function goToStop(wrap: HTMLElement | null, scroller: HTMLElement | null, i: number) {
  if (!wrap || !scroller) return;
  const range = wrap.offsetHeight - scroller.clientHeight;
  scroller.scrollTo({ top: wrap.offsetTop + range * progressOf(i), behavior: "smooth" });
}

export function Metro({ scroller }: { scroller: React.RefObject<HTMLDivElement | null> }) {
  const { l, en } = useL();
  const wrap = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const camera = useRef<SVGGElement>(null);
  const train = useRef<SVGGElement>(null);
  const trainBody = useRef<SVGRectElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const size = useRef({ w: 1200, h: 800 });
  const [active, setActive] = useState(0);
  const [overview, setOverview] = useState(false);
  const [open, setOpen] = useState<Project | null>(null);
  const overviewRef = useRef(false);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const activeRef = useRef(0);

  const { scrollYProgress } = useScroll({ container: scroller, target: wrap, offset: ["start start", "end end"] });
  const distance = useTransform(scrollYProgress, (p) => travel(p).d);
  const smooth = useSpring(distance, { stiffness: 140, damping: 28, mass: 0.6 });

  // Draw train, trail and camera for a distance along the route (imperative: runs every frame).
  const draw = (d: number) => {
    const { w, h } = size.current;
    const p = pointAt(d);
    const mobile = w < 900;
    const fit = Math.min(w / MAP_W, h / MAP_H) * 0.95;
    let scale: number;
    let cx: number;
    let cy: number;
    if (overviewRef.current) {
      scale = mobile ? fit : Math.min((w - 440) / MAP_W, h / MAP_H) * 0.95;
      cx = mobile ? w / 2 : (w - 440) / 2;
      cy = mobile ? h * 0.28 : h / 2;
      camera.current?.setAttribute("transform", `translate(${cx - (MAP_W / 2) * scale} ${cy - (MAP_H / 2) * scale}) scale(${scale})`);
    } else {
      scale = mobile ? Math.max(fit, w / 560) : Math.max(fit, (w - 440) / 820);
      cx = mobile ? w / 2 : (w - 440) / 2;
      cy = mobile ? h * 0.27 : h / 2;
      camera.current?.setAttribute("transform", `translate(${cx - p.x * scale} ${cy - p.y * scale}) scale(${scale})`);
    }
    train.current?.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${p.angle})`);
    trainBody.current?.setAttribute("fill", lineColor(p.line));
    trail.current?.setAttribute("stroke-dashoffset", String(ROUTE_LEN - d));
  };
  useMotionValueEvent(smooth, "change", draw);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const i = travel(p).index;
    if (i === activeRef.current) return;
    activeRef.current = i;
    if (soundRef.current) chime();
    setActive(i);
  });

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      size.current = { w: el.clientWidth, h: el.clientHeight };
      draw(smooth.get());
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    overviewRef.current = overview;
    draw(smooth.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);

  // Ctrl+K and other parts of the page can send the train to a station.
  useEffect(() => {
    const onGo = (e: Event) => {
      const i = STOPS.findIndex((s) => STATIONS[s.s].ref === (e as CustomEvent<string>).detail);
      if (i >= 0) goToStop(wrap.current, scroller.current, i);
    };
    window.addEventListener("v6-goto-station", onGo);
    return () => window.removeEventListener("v6-goto-station", onGo);
  }, [scroller]);

  const go = (i: number) => {
    setOverview(false);
    goToStop(wrap.current, scroller.current, Math.max(0, Math.min(STOPS.length - 1, i)));
  };

  const station = STATIONS[STOPS[active].s];
  const next = STOPS[active + 1] ? STATIONS[STOPS[active + 1].s] : null;
  const name = (key: string) => (en ? STATIONS[key].en : STATIONS[key].ru);

  return (
    <section id="route" ref={wrap} className="relative" style={{ height: `${STOPS.length * 75}vh` }}>
      <div ref={stage} className="sticky top-16 h-[calc(100dvh-4rem)] overflow-hidden">
        <svg className="absolute inset-0 h-full w-full touch-pan-y select-none" role="img" aria-label={l("Схема метро: карьера и проекты", "Metro map: career and projects")}>
          <defs>
            <pattern id="metro-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="var(--line)" />
            </pattern>
            <filter id="metro-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <g ref={camera}>
            <rect x={-2000} y={-2000} width={MAP_W + 4000} height={MAP_H + 4000} fill="url(#metro-dots)" />

            {/* The Yesil river through Astana, like the river on a real metro map. */}
            <path
              d="M-200 540 C 150 470, 300 620, 560 560 S 900 420, 1120 500 S 1450 690, 1800 610"
              fill="none"
              stroke="#38bdf8"
              strokeOpacity="0.16"
              strokeWidth="46"
              strokeLinecap="round"
            />
            <text x="250" y="532" className="fill-sky-400/50 text-[17px] italic" transform="rotate(-4 250 532)">
              {l("р. Есиль", "Yesil river")}
            </text>

            {LINES.map((ln) => (
              <g key={ln.id}>
                <path d={linePath(ln)} fill="none" stroke={ln.color} strokeWidth="14" strokeOpacity="0.28" filter="url(#metro-glow)" />
                <path
                  d={linePath(ln)}
                  fill="none"
                  stroke={ln.color}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={ln.dashed ? "4 18" : undefined}
                />
              </g>
            ))}

            {/* Where the train has been. */}
            <path
              ref={trail}
              d={ROUTE_D}
              fill="none"
              stroke="white"
              strokeOpacity="0.85"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${ROUTE_LEN} ${ROUTE_LEN}`}
              strokeDashoffset={ROUTE_LEN}
            />

            {/* Line badges at the line starts. */}
            {LINES.filter((ln) => badgeOf(ln)).map((ln) => (
              <g key={ln.id} transform={`translate(${badgeOf(ln)![0]} ${badgeOf(ln)![1]})`}>
                <circle r="17" fill={ln.color} />
                <text textAnchor="middle" dy="6" className="fill-white text-[15px] font-bold">
                  {LINES.indexOf(ln) + 1}
                </text>
              </g>
            ))}

            {STOPS.map((st, i) => {
              const s = STATIONS[st.s];
              const lines = linesAt(st.s);
              const transfer = lines.length > 1 && st.s !== "physlab";
              const off = LABEL_OFFSET[s.side];
              const isActive = i === active;
              return (
                <g
                  key={st.s}
                  transform={`translate(${st.x} ${st.y})`}
                  onClick={() => go(i)}
                  className="cursor-pointer"
                  role="button"
                  aria-label={name(st.s)}
                >
                  <circle r="30" fill="transparent" />
                  {isActive && (
                    <circle r="24" fill="none" stroke="rgb(var(--a))" strokeWidth="3">
                      <animate attributeName="r" values="16;30;16" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {st.s === "you" ? (
                    <rect x="-14" y="-14" width="28" height="28" rx="6" fill="var(--bg)" stroke="#94a3b8" strokeWidth="4" strokeDasharray="5 4" />
                  ) : (
                    <circle
                      r={transfer ? 15 : 10}
                      fill="var(--bg)"
                      stroke={transfer ? "var(--fg)" : lineColor(lines[0]?.id ?? "")}
                      strokeWidth={transfer ? 5 : 5}
                    />
                  )}
                  <text
                    x={off.dx + (s.dx ?? 0)}
                    y={off.dy}
                    textAnchor={off.anchor}
                    className={`text-[21px] font-semibold transition-colors ${isActive ? "fill-[var(--fg)]" : "fill-[var(--muted)]"}`}
                    style={{ paintOrder: "stroke", stroke: "var(--bg)", strokeWidth: 6 }}
                  >
                    {name(st.s)}
                  </text>
                </g>
              );
            })}

            <g ref={train} className="pointer-events-none">
              <ellipse rx="34" ry="14" fill="black" opacity="0.25" filter="url(#metro-glow)" />
              <rect ref={trainBody} x="-30" y="-11" width="60" height="22" rx="11" fill="#f97316" stroke="white" strokeWidth="3" />
              {[-16, -4, 8].map((x) => (
                <rect key={x} x={x} y="-5" width="8" height="7" rx="2" fill="white" opacity="0.9" />
              ))}
              <circle cx="24" cy="0" r="3" fill="#fde68a" />
            </g>
          </g>
        </svg>

        {/* Platform display */}
        <div className="absolute left-3 right-3 top-3 flex items-center gap-2 min-[900px]:right-auto">
          <button
            onClick={() => {
              soundRef.current = !sound;
              setSound(!sound);
              if (!sound) chime();
            }}
            aria-label={l("Звук станций", "Station sounds")}
            title={l("Звук станций", "Station sounds")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0b0b0f]/90 text-amber-300 backdrop-blur"
          >
            {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <div className="pointer-events-none inline-flex min-w-0 max-w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0b0b0f]/90 px-3.5 py-2 font-mono text-[12px] text-amber-300 shadow-lg backdrop-blur">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
            <span className="truncate">
              {l("Станция", "Station")}: <b className="text-amber-200">{name(station.key)}</b>
              {next && (
                <span className="text-amber-300/70">
                  {" "}
                  · {l("след.", "next")}: {name(next.key)}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-3 flex gap-2 max-[899px]:hidden">
          <button
            onClick={() => setOverview((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg2)]/90 px-3 py-2 text-[12.5px] text-[var(--muted)] backdrop-blur hover:text-[var(--fg)]"
          >
            {overview ? <MapIcon size={14} /> : <Maximize2 size={14} />}
            {overview ? l("За поездом", "Follow the train") : l("Вся схема", "Whole map")}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg2)]/90 px-3 py-2 text-[12px] text-[var(--muted)] backdrop-blur">
            {LINES.filter((x) => !x.dashed).map((x) => (
              <span key={x.id} className="flex items-center gap-1">
                <span className="h-2 w-4 rounded-full" style={{ background: x.color }} />
                {en ? x.en : x.ru}
              </span>
            ))}
          </div>
        </div>

        <StationPanel
          index={active}
          onGo={go}
          onOpen={(p) => {
            track(`проект 6.0: ${p.title}`);
            setOpen(p);
          }}
        />
      </div>

      <AnimatePresence>{open && <ProjectModal key={open.id} p={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </section>
  );
}

function StationPanel({ index, onGo, onOpen }: { index: number; onGo: (i: number) => void; onOpen: (p: Project) => void }) {
  const { l, tr, en } = useL();
  const st = STATIONS[STOPS[index].s];
  const lines = linesAt(st.key);
  const p = project(st.ref);
  const j = job(st.ref);
  const name = (key: string) => (en ? STATIONS[key].en : STATIONS[key].ru);
  const prev = STOPS[index - 1];
  const next = STOPS[index + 1];

  return (
    <div className="absolute inset-x-2 bottom-2 top-[52%] flex flex-col overflow-hidden rounded-3xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg2)_92%,transparent)] shadow-2xl backdrop-blur-xl min-[900px]:inset-x-auto min-[900px]:bottom-4 min-[900px]:right-4 min-[900px]:top-4 min-[900px]:w-[420px]">
      {/* Remount per station: an exit animation would lag behind fast scrolling. */}
      <motion.div
          key={st.key}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {p && META[p.id] && (
            <button
              onClick={() => onOpen(p)}
              className="group relative block h-36 w-full overflow-hidden min-[900px]:h-44"
              style={{ background: `linear-gradient(135deg, ${META[p.id].hue[0]}, ${META[p.id].hue[1]})` }}
              aria-label={l("Подробнее о проекте", "Project details")}
            >
              <div className="absolute inset-0 bg-black/40" />
              <ProjectPreview id={p.id} hue={META[p.id].hue} />
              {demoOf(p) && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live
                </span>
              )}
            </button>
          )}

          <div className="p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {lines.map((x) => (
                <span key={x.id} className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: x.color }}>
                  {LINES.indexOf(x) + 1} · {en ? x.en : x.ru}
                </span>
              ))}
              {lines.length > 1 && st.key !== "physlab" && (
                <span className="text-[11.5px] text-[var(--muted)]">{l("пересадка", "interchange")}</span>
              )}
            </div>

            {st.key === "start" && (
              <>
                <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
                  {l("Линия Владимира", "The Vladimir Line")}
                </h1>
                <p className="mt-1 text-[14px] text-[rgb(var(--a))]">Frontend / Full-Stack Developer</p>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">{tr(SUMMARY)}</p>
                <p className="mt-2 text-[12.5px] text-[var(--muted)]">{tr(AVAILABILITY)}</p>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[var(--line)] p-3 text-[13px]">
                  <motion.span animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                    <ArrowDown size={16} className="text-[rgb(var(--a))]" />
                  </motion.span>
                  {l(
                    "Крутите вниз — поезд поедет по моей карьере и проектам. Или нажмите на любую станцию.",
                    "Scroll down and the train rides through my career and projects. Or tap any station.",
                  )}
                </div>
              </>
            )}

            {j && (
              <>
                <h2 className="mt-3 text-[22px] font-semibold tracking-tight">{j.title.split(" · ")[0]}</h2>
                <p className="text-[14px] text-[rgb(var(--a))]">{j.title.split(" · ")[1]}</p>
                <p className="mt-1 text-[12.5px] text-[var(--muted)]">{tr(j.period)}</p>
                <ul className="mt-4 space-y-2.5">
                  {j.points.map((pt) => (
                    <li key={pt} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--muted)]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--a))]" />
                      {tr(pt)}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {p && (
              <>
                <h2 className="mt-3 text-[22px] font-semibold tracking-tight">{p.title}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">{tr(p.summary)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tech.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpen(p)}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))] px-4 py-2 text-[13px] font-medium text-white"
                  >
                    <MonitorPlay size={14} /> {demoOf(p) ? l("Подробнее и демо", "Details & demo") : l("Подробнее", "Details")}
                  </button>
                  {p.id === "projects/personal-workspace.tsx" ? (
                    <button
                      onClick={() => setDesign("ide")}
                      className="rounded-full border border-[var(--line)] px-4 py-2 text-[13px] hover:bg-[var(--card-hover)]"
                    >
                      {l("Открыть версию VS Code", "Open the VS Code version")}
                    </button>
                  ) : (
                    <a
                      href={`https://github.com/YpCIIIaK/${p.repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-4 py-2 text-[13px] hover:bg-[var(--card-hover)]"
                    >
                      <FolderGit2 size={14} /> GitHub
                    </a>
                  )}
                </div>
              </>
            )}

            {st.key === "you" && (
              <>
                <h2 className="mt-3 text-[24px] font-semibold leading-tight tracking-tight">
                  {l("Конечная: ваша компания", "Last stop: your company")}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">
                  {l(
                    "Эта станция ещё строится. Ищу удалённую работу — full-time, part-time, контракт или проект. Давайте достроим её вместе.",
                    "This station is still under construction. I'm looking for remote work — full-time, part-time, contract or a project. Let's finish it together.",
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="https://t.me/bigboyvova"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[rgb(var(--a))] to-[rgb(var(--b))] px-4 py-2 text-[13px] font-medium text-white"
                  >
                    <Send size={14} /> Telegram
                  </a>
                  <a href="/cv" target="_blank" className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-4 py-2 text-[13px]">
                    <FileText size={14} /> {l("Резюме PDF", "Resume PDF")}
                  </a>
                  <button onClick={() => scrollToSection("contact")} className="rounded-full border border-[var(--line)] px-4 py-2 text-[13px]">
                    {l("Написать", "Write to me")}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>

      <div className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] px-3 py-2.5 text-[12.5px]">
        <button
          disabled={!prev}
          onClick={() => onGo(index - 1)}
          className="flex min-w-0 flex-1 items-center gap-1 rounded-full px-2 py-1.5 text-left text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-30"
        >
          <ChevronLeft size={15} className="shrink-0" />
          <span className="truncate">{prev ? name(prev.s) : ""}</span>
        </button>
        <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
          {String(index + 1).padStart(2, "0")} / {STOPS.length}
        </span>
        <button
          disabled={!next}
          onClick={() => onGo(index + 1)}
          className="flex min-w-0 flex-1 items-center justify-end gap-1 rounded-full px-2 py-1.5 text-right text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-30"
        >
          <span className="truncate">{next ? name(next.s) : ""}</span>
          <ChevronRight size={15} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}
