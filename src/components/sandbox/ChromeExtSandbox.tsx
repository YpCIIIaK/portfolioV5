"use client";

import { useState } from "react";
import { Shield, ShieldCheck, Fingerprint, Play, Moon, Sun, MemoryStick } from "lucide-react";
import { useTr } from "@/lib/i18n";

/**
 * Interactive demo of the Chrome extensions suite. Two of the three products are
 * playable on mock fixtures: Privacy Guard (page scan → Privacy Score) and
 * TabResurrect (suspend idle tabs → freed RAM). Pure client-side, no real APIs,
 * but the mechanics mirror the extensions' behaviour.
 */

/* ---------------- Privacy Guard ---------------- */

interface Tracker { name: string; kind: string; }
interface Probe { api: string; }

const TRACKERS: Tracker[] = [
  { name: "google-analytics.com", kind: "analytics" },
  { name: "connect.facebook.net", kind: "social pixel" },
  { name: "doubleclick.net", kind: "ad" },
  { name: "hotjar.com", kind: "session replay" },
  { name: "scorecardresearch.com", kind: "analytics" },
];
const PROBES: Probe[] = [
  { api: "canvas.toDataURL()" },
  { api: "WebGLRenderingContext" },
  { api: "AudioContext fingerprint" },
  { api: "navigator.fonts" },
];

function PrivacyGuard() {
  const tr = useTr();
  const [scanned, setScanned] = useState(false);
  const [blocking, setBlocking] = useState(true);

  const blocked = blocking ? TRACKERS.length + PROBES.length : 0;
  // Score: clean page = 100; each unblocked tracker/probe costs points.
  const score = blocking ? 96 : Math.max(0, 100 - TRACKERS.length * 12 - PROBES.length * 6);
  const grade = score >= 85 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setScanned(true)}
          className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
        >
          <Play size={13} /> {tr("Сканировать страницу")}
        </button>
        <button
          onClick={() => setBlocking((v) => !v)}
          disabled={!scanned}
          className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12px] transition disabled:opacity-50 ${
            blocking ? "border-vsc-accent bg-vsc-accent/15 text-vsc-bright" : "border-vsc-line text-vsc-muted hover:text-vsc-text"
          }`}
        >
          <Shield size={13} /> {blocking ? tr("Блокировка: вкл") : tr("Блокировка: выкл")}
        </button>
      </div>

      {!scanned ? (
        <p className="text-[12px] text-vsc-muted">{tr("Нажми «Сканировать», чтобы проверить страницу на трекеры и фингерпринтинг.")}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded border border-vsc-line bg-[#252526] px-4 py-3">
            <div className={`text-4xl font-bold ${grade}`}>{score}</div>
            <div className="text-[12px] text-vsc-muted">
              <div className="flex items-center gap-1 text-vsc-text">
                {blocking ? <ShieldCheck size={14} className="text-green-400" /> : <Shield size={14} className="text-red-400" />}
                Privacy Score · {blocked} {tr("заблокировано")}
              </div>
              <div>{TRACKERS.length} {tr("трекеров")} · {PROBES.length} {tr("проб фингерпринта")}</div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-vsc-muted">{tr("Трекеры")}</div>
            <div className="space-y-1">
              {TRACKERS.map((t) => (
                <div key={t.name} className="flex items-center gap-2 rounded border border-vsc-line bg-[#252526] px-2.5 py-1 text-[12px]">
                  <span className={`h-1.5 w-1.5 rounded-full ${blocking ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="font-mono text-vsc-text">{t.name}</span>
                  <span className="text-vsc-muted">· {t.kind}</span>
                  <span className={`ml-auto text-[11px] ${blocking ? "text-green-400" : "text-red-400"}`}>
                    {blocking ? tr("заблокирован") : tr("пропущен")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-vsc-muted">
              <Fingerprint size={12} /> {tr("Попытки фингерпринтинга")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PROBES.map((p) => (
                <span key={p.api} className={`rounded border px-2 py-0.5 font-mono text-[11px] ${blocking ? "border-green-400/40 text-green-400" : "border-red-400/40 text-red-400"}`}>
                  {p.api}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- TabResurrect ---------------- */

interface Tab { id: number; title: string; mb: number; idle: boolean; suspended: boolean; }

const INITIAL_TABS: Tab[] = [
  { id: 1, title: "docs.google.com — ТЗ", mb: 320, idle: true, suspended: false },
  { id: 2, title: "github.com/YpCIIIaK", mb: 210, idle: false, suspended: false },
  { id: 3, title: "youtube.com — фоновое видео", mb: 540, idle: true, suspended: false },
  { id: 4, title: "figma.com — макет", mb: 480, idle: true, suspended: false },
  { id: 5, title: "stackoverflow.com", mb: 180, idle: true, suspended: false },
  { id: 6, title: "mail.google.com (активная)", mb: 260, idle: false, suspended: false },
];

function TabResurrect() {
  const tr = useTr();
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);

  const freed = tabs.filter((t) => t.suspended).reduce((a, t) => a + t.mb, 0);
  const live = tabs.filter((t) => !t.suspended).reduce((a, t) => a + t.mb, 0);

  const toggle = (id: number) =>
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, suspended: !t.suspended } : t)));
  const sweepIdle = () =>
    setTabs((ts) => ts.map((t) => (t.idle ? { ...t, suspended: true } : t)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={sweepIdle}
          className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
        >
          <Moon size={13} /> {tr("Усыпить простаивающие")}
        </button>
        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-vsc-muted">
          <MemoryStick size={13} className="text-green-400" />
          {tr("Освобождено:")} <span className="font-semibold text-green-400">{freed} МБ</span>
          <span className="text-vsc-muted">· {tr("активно")} {live} МБ</span>
        </span>
      </div>
      <div className="space-y-1">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-[12px] transition ${
              t.suspended ? "border-vsc-line bg-[#1e1e1e] opacity-55" : "border-vsc-line bg-[#252526]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${t.idle ? "bg-yellow-400" : "bg-green-400"}`} title={t.idle ? "idle" : "active"} />
            <span className={`truncate ${t.suspended ? "text-vsc-muted line-through" : "text-vsc-text"}`}>{tr(t.title)}</span>
            <span className="ml-auto font-mono text-[11px] text-vsc-muted">{t.suspended ? "0" : t.mb} МБ</span>
            <button
              onClick={() => toggle(t.id)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-vsc-light-blue hover:bg-vsc-hover"
            >
              {t.suspended ? <><Sun size={11} /> {tr("вернуть")}</> : <><Moon size={11} /> {tr("усыпить")}</>}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-vsc-muted">{tr("Усыплённые вкладки освобождают RAM (tabs.discard) и мгновенно восстанавливаются при возврате.")}</p>
    </div>
  );
}

/* ---------------- shell ---------------- */

export function ChromeExtSandbox() {
  const tr = useTr();
  const [product, setProduct] = useState<"privacy" | "tabs">("privacy");

  return (
    <div className="mt-2 rounded-lg border border-vsc-line bg-[#1e1e1e]">
      <div className="flex items-center gap-2 border-b border-vsc-line px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </span>
        <span className="font-mono text-[12px] text-vsc-muted">chrome-extensions — {tr("живое демо")}</span>
      </div>

      <div className="flex gap-1 border-b border-vsc-line px-2 pt-2">
        <button
          onClick={() => setProduct("privacy")}
          className={`flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[12px] ${product === "privacy" ? "bg-[#252526] text-vsc-bright" : "text-vsc-muted hover:text-vsc-text"}`}
        >
          <Shield size={13} /> Privacy Guard
        </button>
        <button
          onClick={() => setProduct("tabs")}
          className={`flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[12px] ${product === "tabs" ? "bg-[#252526] text-vsc-bright" : "text-vsc-muted hover:text-vsc-text"}`}
        >
          <MemoryStick size={13} /> TabResurrect
        </button>
      </div>

      <div className="p-4">{product === "privacy" ? <PrivacyGuard /> : <TabResurrect />}</div>
    </div>
  );
}
