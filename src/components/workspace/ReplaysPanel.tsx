"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Trash2, RefreshCw } from "lucide-react";
import type { ReplayEvent, ReplayMeta } from "@/lib/replay";

interface SessionRow {
  id: string;
  started_at: string;
  duration_ms: number;
  events_count: number;
  meta: (ReplayMeta & { geo?: string; ip?: string }) | null;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function device(ua = "") {
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "?";
  const br = /Edg\//.test(ua) ? "Edge" : /YaBrowser/.test(ua) ? "Yandex" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "?";
  return `${br} · ${os}`;
}

/** Owner-only list of recorded visits and a player that replays them over a live copy of the site. */
export function ReplaysPanel() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<{ session: SessionRow; events: ReplayEvent[] } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/replay");
    if (!r.ok) return setError(r.status === 401 ? "Нужно войти как владелец." : `Ошибка ${r.status}`);
    setError("");
    setSessions((await r.json()).sessions ?? []);
  }, []);

  const open = useCallback(async (id: string) => {
    const r = await fetch(`/api/replay?id=${id}`);
    if (!r.ok) return setError(`Ошибка ${r.status}`);
    const j = await r.json();
    if (j.session) setActive({ session: j.session, events: j.events ?? [] });
  }, []);

  // Initial list (+ a session from the Telegram link: ?replayId=). State is set
  // in the promise callbacks, after the effect has run.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("replayId");
    Promise.resolve()
      .then(load)
      .then(() => (id ? open(id) : undefined));
  }, [load, open]);

  const remove = async (id: string) => {
    if (!confirm("Удалить запись?")) return;
    await fetch(`/api/replay?id=${id}`, { method: "DELETE" });
    if (active?.session.id === id) setActive(null);
    void load();
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 text-[13px] text-vsc-text">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[18px] font-semibold text-vsc-bright">Записи визитов</h1>
        <button onClick={() => void load()} className="rounded p-1 hover:bg-vsc-hover" title="Обновить">
          <RefreshCw size={14} />
        </button>
        <span className="text-vsc-muted">хранятся 90 дней</span>
      </div>
      {error && <p className="mb-3 text-red-400">{error}</p>}
      {active && <Player key={active.session.id} session={active.session} events={active.events} onClose={() => setActive(null)} />}
      {sessions === null ? (
        <p className="text-vsc-muted">Загрузка…</p>
      ) : sessions.length === 0 ? (
        <p className="text-vsc-muted">Пока нет записей. Если их нет и после визитов — проверь, что в Supabase созданы таблицы ws_replays и ws_replay_chunks (docs/workspace-schema.sql).</p>
      ) : (
        <table className="w-full border-collapse">
          <thead className="text-left text-vsc-muted">
            <tr>
              <th className="py-1 font-normal">Когда</th>
              <th className="font-normal">Откуда</th>
              <th className="font-normal">Метка</th>
              <th className="font-normal">Устройство</th>
              <th className="font-normal">Длит.</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => void open(s.id)}
                className={`cursor-pointer border-t border-vsc-line hover:bg-vsc-hover ${active?.session.id === s.id ? "bg-vsc-active" : ""}`}
              >
                <td className="py-1.5">{new Date(s.started_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                <td>{s.meta?.geo || "—"}</td>
                <td>{s.meta?.ref || ""}</td>
                <td>{device(s.meta?.ua)}{s.meta ? ` · ${s.meta.w}×${s.meta.h}` : ""}</td>
                <td>{fmt(s.duration_ms)}</td>
                <td className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(s.id);
                    }}
                    className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-red-400"
                    title="Удалить"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const SPEEDS = [1, 2, 4, 8];
const IDLE_GAP = 3000;

function Player({ session, events, onClose }: { session: SessionRow; events: ReplayEvent[]; onClose: () => void }) {
  const sorted = useMemo(() => [...events].sort((a, b) => a.t - b.t), [events]);
  const duration = sorted.length ? sorted[sorted.length - 1].t : 0;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [skipIdle, setSkipIdle] = useState(true);
  const [boxWidth, setBoxWidth] = useState(800);
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const applied = useRef({ file: "", scroll: -1 });

  // State at `time`: last file, scroll, size, pointer, recent clicks.
  const view = useMemo(() => {
    let file = session.meta?.file ?? "";
    let scroll = 0;
    let w = session.meta?.w ?? 1280;
    let h = session.meta?.h ?? 800;
    let x = -100;
    let y = -100;
    let hidden = false;
    const clicks: { x: number; y: number; age: number }[] = [];
    for (const e of sorted) {
      if (e.t > time) break;
      if (e.k === "f") file = e.id;
      else if (e.k === "s") scroll = e.r;
      else if (e.k === "w") {
        w = e.w;
        h = e.h;
      } else if (e.k === "m") {
        x = e.x;
        y = e.y;
      }
      else if (e.k === "c") {
        x = e.x;
        y = e.y;
        if (time - e.t < 800) clicks.push({ x: e.x, y: e.y, age: time - e.t });
      } else if (e.k === "v") hidden = !e.on;
    }
    return { file, scroll, w, h, x, y, hidden, clicks };
  }, [sorted, time, session.meta]);

  // Drive the iframe only when file / scroll actually change.
  useEffect(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    if (view.file && view.file !== applied.current.file) {
      win.postMessage({ type: "replay-open", id: view.file }, location.origin);
      applied.current.file = view.file;
      applied.current.scroll = -1;
    }
    if (view.scroll !== applied.current.scroll) {
      win.postMessage({ type: "replay-scroll", r: view.scroll }, location.origin);
      applied.current.scroll = view.scroll;
    }
  }, [view.file, view.scroll]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Playback clock; long pauses are skipped when "skip idle" is on.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = (now - last) * speed;
      last = now;
      setTime((t) => {
        let next = t + dt;
        if (skipIdle) {
          const upcoming = sorted.find((e) => e.t > t);
          if (upcoming && upcoming.t - t > IDLE_GAP) next = upcoming.t - 300;
        }
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, skipIdle, sorted, duration]);

  const scale = Math.min(1, boxWidth / view.w);
  const log = sorted.filter((e) => e.k === "f" || e.k === "c" || e.k === "i");
  const src = `/?replay=1${session.meta?.file ? `&file=${encodeURIComponent(session.meta.file)}` : ""}`;

  return (
    <div className="mb-6 rounded border border-vsc-line p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button onClick={() => setPlaying((p) => !p)} className="rounded bg-vsc-accent px-2 py-1 text-white">
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <span className="font-mono">{fmt(time)} / {fmt(duration)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          value={time}
          onChange={(e) => setTime(Number(e.target.value))}
          className="min-w-40 flex-1"
        />
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => setSpeed(s)} className={`rounded px-1.5 ${speed === s ? "bg-vsc-active text-vsc-bright" : "text-vsc-muted"}`}>
            {s}×
          </button>
        ))}
        <label className="flex items-center gap-1 text-vsc-muted">
          <input type="checkbox" checked={skipIdle} onChange={(e) => setSkipIdle(e.target.checked)} /> пропускать паузы
        </label>
        <button onClick={onClose} className="ml-auto text-vsc-muted hover:text-vsc-bright">закрыть</button>
      </div>
      <p className="mb-2 text-vsc-muted">
        {session.meta?.geo || "—"} {session.meta?.ip ? `(${session.meta.ip})` : ""} · {device(session.meta?.ua)} · окно {view.w}×{view.h}
        {session.meta?.ref ? ` · метка: ${session.meta.ref}` : ""}
        {view.hidden ? " · 💤 вкладка скрыта" : ""}
      </p>
      <div ref={boxRef} className="w-full overflow-hidden">
        <div style={{ width: view.w * scale, height: view.h * scale }} className="relative">
          <div style={{ width: view.w, height: view.h, transform: `scale(${scale})`, transformOrigin: "0 0" }} className="absolute left-0 top-0">
            <iframe
              ref={frameRef}
              src={src}
              title="replay"
              className="pointer-events-none h-full w-full border-0 bg-white"
              onLoad={() => (applied.current = { file: "", scroll: -1 })}
            />
            <div className="pointer-events-none absolute inset-0">
              {view.clicks.map((c, i) => (
                <span
                  key={i}
                  className="absolute rounded-full border-2 border-red-500"
                  style={{ left: c.x - 14, top: c.y - 14, width: 28, height: 28, opacity: 1 - c.age / 800 }}
                />
              ))}
              <svg className="absolute" style={{ left: view.x - 2, top: view.y - 2 }} width="22" height="22" viewBox="0 0 22 22">
                <path d="M2 2 L2 18 L7 13 L11 21 L14 19.5 L10 12 L17 12 Z" fill="#111" stroke="#fff" strokeWidth="1.3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-vsc-muted">События ({log.length})</summary>
        <ul className="mt-1 max-h-48 overflow-y-auto font-mono text-[12px]">
          {log.map((e, i) => (
            <li key={i}>
              <button onClick={() => setTime(e.t)} className="text-left hover:text-vsc-bright">
                {fmt(e.t)} ·{" "}
                {e.k === "f" ? `открыл ${e.id}` : e.k === "c" ? `клик${e.l ? `: ${e.l}` : ""}` : e.k === "i" ? `ввод: ${e.n} клавиш${e.l ? ` (${e.l})` : ""}` : ""}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
