"use client";

import { useCallback, useState } from "react";
import { Music, Play, Plus, Trash2, ExternalLink } from "lucide-react";
import { useEditor } from "@/lib/store";
import {
  parseYmInput,
  ymEmbedSrc,
  ymEmbedHeight,
  ymDefaultLabel,
  loadSavedYm,
  persistSavedYm,
  loadCurrentYm,
  persistCurrentYm,
  type YmItem,
  type YmEmbed,
} from "@/lib/yandex-music";

function YmPlayer({ embed, compact }: { embed: YmEmbed; compact?: boolean }) {
  return (
    <iframe
      title="Яндекс Музыка"
      frameBorder={0}
      allow="autoplay *; encrypted-media *; fullscreen *"
      src={ymEmbedSrc(embed)}
      className="w-full rounded-lg border border-vsc-line bg-black/20"
      style={{ height: compact && embed.type === "track" ? 100 : ymEmbedHeight(embed) }}
    />
  );
}

function useYmPlayer() {
  const [current, setCurrent] = useState<YmItem | null>(() => loadCurrentYm());
  const [saved, setSaved] = useState<YmItem[]>(() => loadSavedYm());
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const play = useCallback((item: YmItem) => {
    setCurrent(item);
    persistCurrentYm(item);
    setError("");
  }, []);

  const playInput = useCallback(() => {
    const embed = parseYmInput(draft);
    if (!embed) {
      setError("Не распознал ссылку. Вставь URL трека, альбома или плейлиста с music.yandex.ru");
      return;
    }
    const item: YmItem = {
      id: crypto.randomUUID(),
      label: ymDefaultLabel(embed),
      url: draft.trim(),
      embed,
    };
    play(item);
  }, [draft, play]);

  const saveCurrent = useCallback(() => {
    if (!current) return;
    setSaved((prev) => {
      const exists = prev.some(
        (x) => ymEmbedSrc(x.embed) === ymEmbedSrc(current.embed),
      );
      if (exists) return prev;
      const next = [{ ...current, id: crypto.randomUUID() }, ...prev].slice(0, 40);
      persistSavedYm(next);
      return next;
    });
  }, [current]);

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((x) => x.id !== id);
      persistSavedYm(next);
      return next;
    });
  }, []);

  return { current, saved, draft, setDraft, error, play, playInput, saveCurrent, removeSaved };
}

function SavedList({
  items,
  active,
  onPlay,
  onRemove,
}: {
  items: YmItem[];
  active: YmItem | null;
  onPlay: (item: YmItem) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-[12px] text-vsc-muted/70">Сохранённых треков пока нет</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = active && ymEmbedSrc(active.embed) === ymEmbedSrc(item.embed);
        return (
          <div
            key={item.id}
            className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
              isActive ? "border-vsc-accent/50 bg-vsc-accent/10" : "border-vsc-line/60 hover:bg-vsc-hover"
            }`}
          >
            <button
              type="button"
              onClick={() => onPlay(item)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Play size={13} className="shrink-0 text-vsc-accent" />
              <span className="truncate text-[13px] text-vsc-text">{item.label}</span>
            </button>
            <a
              href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded p-1 text-vsc-muted opacity-0 hover:text-vsc-text group-hover:opacity-100"
              title="Открыть в Яндекс Музыке"
            >
              <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 rounded p-1 text-vsc-muted opacity-0 hover:text-red-400 group-hover:opacity-100"
              title="Удалить"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function MusicPanel() {
  const { current, saved, draft, setDraft, error, play, playInput, saveCurrent, removeSaved } = useYmPlayer();

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="mb-1 flex items-center gap-2 text-[22px] font-semibold text-vsc-bright">
        <Music size={20} className="text-vsc-accent" /> Яндекс Музыка
      </h1>
      <p className="mb-5 text-[13px] text-vsc-muted">Вставь ссылку на трек, альбом или плейлист — или выбери из сохранённых</p>

      <div className="mb-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && playInput()}
          placeholder="https://music.yandex.ru/album/…/track/…"
          className="min-w-0 flex-1 rounded-lg border border-vsc-line bg-vsc-editor px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent"
        />
        <button
          type="button"
          onClick={playInput}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-vsc-accent px-3 py-2 text-[13px] text-white hover:opacity-90"
        >
          <Play size={14} /> Играть
        </button>
      </div>
      {error && <p className="mb-3 text-[12px] text-vsc-yellow">{error}</p>}

      {current && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] text-vsc-muted">Сейчас играет · {current.label}</span>
            <button
              type="button"
              onClick={saveCurrent}
              className="flex items-center gap-1 text-[12px] text-vsc-muted hover:text-vsc-text"
            >
              <Plus size={13} /> В сохранённые
            </button>
          </div>
          <YmPlayer embed={current.embed} />
        </div>
      )}

      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-vsc-muted">Сохранённые</div>
        <SavedList items={saved} active={current} onPlay={play} onRemove={removeSaved} />
      </div>
    </div>
  );
}

/** Compact player for the dashboard. */
export function MusicWidget() {
  const openFile = useEditor((s) => s.openFile);
  const { current, saved, draft, setDraft, error, play, playInput } = useYmPlayer();

  return (
    <div className="rounded-lg border border-vsc-line bg-vsc-sidebar p-4 md:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => openFile("workspace/music.tsx")}
          className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-vsc-muted hover:text-vsc-text"
        >
          <Music size={14} /> Яндекс Музыка
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && playInput()}
          placeholder="Ссылка на трек…"
          className="min-w-0 flex-1 rounded border border-vsc-line bg-vsc-editor px-2 py-1.5 text-[12px] text-vsc-text outline-none focus:border-vsc-accent"
        />
        <button
          type="button"
          onClick={playInput}
          className="shrink-0 rounded bg-vsc-accent px-2.5 py-1.5 text-[12px] text-white hover:opacity-90"
        >
          <Play size={13} />
        </button>
      </div>
      {error && <p className="mb-2 text-[11px] text-vsc-yellow">{error}</p>}

      {current && <YmPlayer embed={current.embed} compact />}

      {saved.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {saved.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => play(item)}
              className="max-w-[140px] truncate rounded-full border border-vsc-line px-2.5 py-1 text-[11px] text-vsc-text hover:border-vsc-accent hover:bg-vsc-hover"
              title={item.label}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
