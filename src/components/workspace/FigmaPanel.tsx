"use client";
/* eslint-disable react-hooks/set-state-in-effect -- ported from figma-to-code; effects sync derived state, code is proven. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Frame, History, X, HelpCircle } from "lucide-react";
import LayerTree from "./figma/LayerTree";
import CodePanel from "./figma/CodePanel";
import PreviewPanel from "./figma/PreviewPanel";
import TokensPanel from "./figma/TokensPanel";
import { convertNode, convertNodes, combineNodes } from "@/lib/figma/convert";
import { findNode, toTree } from "@/lib/figma/tree";
import type { FigmaNode, TreeNode, VarToken } from "@/lib/figma/types";
import { makeZip, downloadBlob, dataUriToBytes, type ZipEntry } from "@/lib/figma/zip";
import {
  loadEdits,
  saveEdit,
  deleteEdit,
  loadHistory,
  saveHistory,
  removeHistory,
  type HistoryEntry,
} from "@/lib/figma/storage";

/**
 * Figma → Code, ported into the workspace as a self-contained tab. The heavy
 * lifting (Figma REST proxy, conversion) runs in /api/figma/* and /api/convert;
 * this component only orchestrates. Semi-local: the token stays in the browser
 * (or FIGMA_TOKEN env server-side), and plugin mode needs the app running as a
 * single local process (its SSE relay is in-memory).
 */
export function FigmaPanel() {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fileKey, setFileKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [rootNode, setRootNode] = useState<FigmaNode | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiMode, setMultiMode] = useState<"combine" | "separate">("combine");
  const [useTokens, setUseTokens] = useState(false);
  const [semantic, setSemantic] = useState(true);
  const [inferLayout, setInferLayout] = useState(false);
  const [responsive, setResponsive] = useState(false);
  const [variables, setVariables] = useState<VarToken[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"code" | "tokens">("code");

  const [inputMode, setInputMode] = useState<"rest" | "plugin">("rest");
  const [pluginConnected, setPluginConnected] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const editsRef = useRef<Record<string, string>>({});
  const [htmlGenerated, setHtmlGenerated] = useState("");
  const [htmlIsEdited, setHtmlIsEdited] = useState(false);

  const previewCache = useRef<Map<string, string | null>>(new Map());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestedId = useRef<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("figma-token");
    if (t) setToken(t);
    const u = localStorage.getItem("figma-url");
    if (u) setUrl(u);
    editsRef.current = loadEdits();
    setHistory(loadHistory());
  }, []);

  const selectionKey = useMemo(() => {
    const ids = [...selectedIds].sort().join(",");
    return `${fileKey ?? ""}|${ids}|${multiMode}|${useTokens ? 1 : 0}|${semantic ? 1 : 0}|${inferLayout ? 1 : 0}|${responsive ? 1 : 0}`;
  }, [fileKey, selectedIds, multiMode, useTokens, semantic, inferLayout, responsive]);

  const selectedNodes = useMemo(() => {
    if (!rootNode) return [];
    return [...selectedIds]
      .map((id) => findNode(rootNode, id))
      .filter((n): n is FigmaNode => !!n);
  }, [rootNode, selectedIds]);

  const converted = useMemo(() => {
    if (!selectedNodes.length) return null;
    const opts = { absolutePositioning: true, useTokens, semantic, inferLayout, responsive, variables };
    if (selectedNodes.length === 1) return convertNode(selectedNodes[0], opts);
    return convertNodes(selectedNodes, multiMode, opts);
  }, [selectedNodes, multiMode, useTokens, semantic, inferLayout, responsive, variables]);

  const tokenNode = useMemo(() => {
    if (!selectedNodes.length) return null;
    if (selectedNodes.length === 1) return selectedNodes[0];
    return combineNodes(selectedNodes);
  }, [selectedNodes]);

  const [reactCode, setReactCode] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [vueCode, setVueCode] = useState("");
  const [cssJsx, setCssJsx] = useState("");
  const [cssText, setCssText] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const assetCache = useRef<Map<string, string>>(new Map());

  const applyPlugin = useCallback(
    (data: {
      fileName?: string;
      node: FigmaNode;
      assets?: { svg?: Record<string, string>; png?: Record<string, string> };
      preview?: string | null;
      variables?: VarToken[];
    }) => {
      const node = data.node;
      for (const [id, m] of Object.entries(data.assets?.svg ?? {})) assetCache.current.set(`svg:${id}`, m);
      for (const [id, u] of Object.entries(data.assets?.png ?? {})) assetCache.current.set(`png:${id}`, u);
      setError(null);
      setFileKey("plugin");
      const fname = data.fileName || "Figma plugin";
      setFileName(fname);
      const tr = toTree(node);
      setTree(tr);
      setRootNode(node);
      setActiveId(node.id);
      setSelectedIds(new Set([node.id]));
      setPreviewUrl(data.preview ?? null);
      setPreviewLoading(false);
      const vars = data.variables ?? [];
      setVariables(vars);
      if (vars.length) setUseTokens(true);
      const entry: HistoryEntry = {
        fileKey: "plugin",
        fileName: fname,
        source: "plugin",
        savedAt: Date.now(),
        node,
        tree: tr,
        variables: vars,
      };
      setHistory((h) => saveHistory(entry, h));
    },
    [],
  );

  useEffect(() => {
    if (inputMode !== "plugin") return;
    const es = new EventSource("/api/plugin/stream");
    es.onopen = () => setPluginConnected(true);
    es.onerror = () => setPluginConnected(false);
    es.onmessage = (e) => {
      try {
        applyPlugin(JSON.parse(e.data));
      } catch {
        /* ignore malformed payloads */
      }
    };
    return () => {
      es.close();
      setPluginConnected(false);
    };
  }, [inputMode, applyPlugin]);

  useEffect(() => {
    const themeCss = converted?.themeCss;
    const reactHeader = themeCss ? `/* Tailwind v4 — вставьте в globals.css:\n${themeCss}*/\n\n` : "";
    const htmlHeader = themeCss ? `<!-- Tailwind v4 — вставьте в globals.css:\n${themeCss}-->\n` : "";

    if (!converted || !fileKey) {
      const gen = htmlHeader + (converted?.html ?? "");
      const edit = editsRef.current[selectionKey];
      setReactCode(reactHeader + (converted?.code ?? ""));
      setHtmlGenerated(gen);
      setHtmlCode(edit ?? gen);
      setHtmlIsEdited(!!edit);
      setVueCode(converted?.vue ?? "");
      setCssJsx(converted?.cssModule.jsx ?? "");
      setCssText(converted?.cssModule.css ?? "");
      setPreviewHtml(edit ?? converted?.html ?? "");
      return;
    }
    let cancelled = false;
    const { code, html, vue, cssModule, assets } = converted;

    const inject = (
      text: string,
      mode: "datauri" | "inline",
      svg: Record<string, string>,
      png: Record<string, string>,
    ) => {
      let res = text;
      for (const a of assets) {
        if (a.kind === "svg") {
          const markup = svg[a.id];
          if (mode === "datauri") {
            const dataUri = markup ? `data:image/svg+xml,${encodeURIComponent(markup)}` : "";
            res = res.replace(`@@ASSET:${a.id}@@`, dataUri);
          } else if (markup) {
            const svgWithClass = markup.replace(/<svg\b/, `<svg class="${a.className}"`);
            res = res.replace(new RegExp(`<img class="[^"]*"[^>]*?src="@@ASSET:${a.id}@@"[^>]*/>`), svgWithClass);
          }
        } else {
          res = res.replace(`@@ASSET:${a.id}@@`, png[a.id] ?? "");
        }
      }
      return res;
    };

    const apply = (svg: Record<string, string>, png: Record<string, string>) => {
      if (cancelled) return;
      const resHtml = inject(html, "inline", svg, png);
      const genHtml = htmlHeader + resHtml;
      const edit = editsRef.current[selectionKey];
      setReactCode(reactHeader + inject(code, "datauri", svg, png));
      setHtmlGenerated(genHtml);
      setHtmlCode(edit ?? genHtml);
      setHtmlIsEdited(!!edit);
      setVueCode(inject(vue, "inline", svg, png));
      setCssJsx(inject(cssModule.jsx, "datauri", svg, png));
      setCssText(cssModule.css);
      setPreviewHtml(edit ?? resHtml);
    };

    if (!assets.length) {
      apply({}, {});
      return;
    }

    const svgCached: Record<string, string> = {};
    const svgIds: string[] = [];
    const pngCached: Record<string, string> = {};
    const pngIds: string[] = [];
    for (const a of assets) {
      const hit = assetCache.current.get(`${a.kind}:${a.id}`);
      if (hit != null) {
        if (a.kind === "svg") svgCached[a.id] = hit;
        else pngCached[a.id] = hit;
      } else if (a.kind === "svg") svgIds.push(a.id);
      else pngIds.push(a.id);
    }

    apply(svgCached, pngCached);

    if (!svgIds.length && !pngIds.length) return;
    if (fileKey === "plugin") return;

    (async () => {
      const attempt = async (): Promise<boolean> => {
        const res = await fetch("/api/figma/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, fileKey, svgIds, pngIds }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (cancelled) return true;
        const svg = { ...svgCached, ...(data.svg ?? {}) };
        const png = { ...pngCached, ...(data.png ?? {}) };
        for (const [id, m] of Object.entries(data.svg ?? {})) assetCache.current.set(`svg:${id}`, m as string);
        for (const [id, u] of Object.entries(data.png ?? {})) assetCache.current.set(`png:${id}`, u as string);
        apply(svg, png);
        return true;
      };
      try {
        if (await attempt()) return;
        await new Promise((r) => setTimeout(r, 4000));
        if (!cancelled) await attempt();
      } catch {
        /* keep placeholders on failure */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [converted, fileKey, token, selectionKey]);

  const downloadZip = useCallback(() => {
    if (!converted) return;
    const name = converted.componentName || "Component";
    const files: ZipEntry[] = [
      { name: `${name}.tsx`, data: reactCode },
      { name: `${name}.html`, data: htmlCode },
      { name: `${name}.vue`, data: vueCode },
      { name: `${name}.module.tsx`, data: cssJsx },
      { name: `${name}.module.css`, data: cssText },
    ];
    if (converted.themeCss) files.push({ name: "tokens.css", data: converted.themeCss });

    const pngNotes: string[] = [];
    for (const a of converted.assets) {
      const hit = assetCache.current.get(`${a.kind}:${a.id}`);
      if (!hit) continue;
      const safe = a.id.replace(/:/g, "-");
      if (a.kind === "svg") {
        files.push({ name: `assets/${safe}.svg`, data: hit });
      } else {
        const bytes = dataUriToBytes(hit);
        if (bytes) files.push({ name: `assets/${safe}.png`, data: bytes });
        else pngNotes.push(`${safe}.png → ${hit}`);
      }
    }

    const readme =
      `Figma Copy — экспорт «${fileName || name}»\n\n` +
      `Файлы:\n` +
      `  ${name}.tsx          React + Tailwind\n` +
      `  ${name}.html         HTML + Tailwind (CDN)\n` +
      `  ${name}.vue          Vue 3 SFC\n` +
      `  ${name}.module.tsx   React + CSS-modules\n` +
      `  ${name}.module.css   стили к .module.tsx\n` +
      (converted.themeCss ? `  tokens.css           Tailwind v4 @theme токены\n` : "") +
      `  assets/              иконки (svg) и картинки (png)\n` +
      (pngNotes.length ? `\nКартинки по ссылке (не встроены — внешний URL):\n  ${pngNotes.join("\n  ")}\n` : "");
    files.push({ name: "README.txt", data: readme });

    downloadBlob(makeZip(files), `${name}.zip`);
  }, [converted, reactCode, htmlCode, vueCode, cssJsx, cssText, fileName]);

  const handleHtmlEdit = useCallback(
    (html: string) => {
      setPreviewHtml(html);
      saveEdit(editsRef.current, selectionKey, html);
      setHtmlIsEdited(true);
    },
    [selectionKey],
  );

  const resetHtml = useCallback(() => {
    deleteEdit(editsRef.current, selectionKey);
    setHtmlIsEdited(false);
    setHtmlCode(htmlGenerated);
    setPreviewHtml(htmlGenerated.replace(/^<!--[\s\S]*?-->\n/, ""));
  }, [selectionKey, htmlGenerated]);

  const restoreEntry = useCallback((entry: HistoryEntry) => {
    setError(null);
    setShowHistory(false);
    setInputMode(entry.source);
    setFileKey(entry.fileKey);
    setFileName(entry.fileName);
    if (entry.url) setUrl(entry.url);
    setTree(entry.tree);
    setRootNode(entry.node);
    setActiveId(entry.node.id);
    setSelectedIds(new Set([entry.node.id]));
    setVariables(entry.variables ?? []);
    setPreviewUrl(null);
  }, []);

  const fetchPreview = useCallback(
    async (id: string, key?: string) => {
      const fk = key ?? fileKey;
      if (!fk) return;
      if (fk === "plugin") {
        setPreviewLoading(false);
        return;
      }
      if (previewCache.current.has(id)) {
        setPreviewUrl(previewCache.current.get(id) ?? null);
        setPreviewLoading(false);
        return;
      }
      lastRequestedId.current = id;
      setError(null);
      setPreviewLoading(true);
      setPreviewUrl(null);
      try {
        const res = await fetch("/api/figma/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, fileKey: fk, ids: [id] }),
        });
        const data = await res.json();
        if (res.ok) {
          const u = data.images?.[id] ?? null;
          previewCache.current.set(id, u);
          if (lastRequestedId.current === id) setPreviewUrl(u);
        } else if (lastRequestedId.current === id) {
          setError(data.error ?? "Не удалось получить превью");
        }
      } catch {
        /* ignore preview errors */
      } finally {
        if (lastRequestedId.current === id) setPreviewLoading(false);
      }
    },
    [fileKey, token],
  );

  const queuePreview = useCallback(
    (id: string, key?: string) => {
      if ((key ?? fileKey) === "plugin") return;
      if (previewCache.current.has(id)) {
        setPreviewUrl(previewCache.current.get(id) ?? null);
        return;
      }
      setPreviewLoading(true);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => fetchPreview(id, key), 400);
    },
    [fetchPreview, fileKey],
  );

  const selectNode = useCallback(
    (n: TreeNode) => {
      setActiveId(n.id);
      setSelectedIds(new Set([n.id]));
      queuePreview(n.id);
    },
    [queuePreview],
  );

  const toggleNode = useCallback(
    (n: TreeNode) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(n.id)) next.delete(n.id);
        else next.add(n.id);
        return next;
      });
      setActiveId(n.id);
      queuePreview(n.id);
    },
    [queuePreview],
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    setTree(null);
    setActiveId(null);
    setSelectedIds(new Set());
    setVariables([]);
    setPreviewUrl(null);
    previewCache.current.clear();
    localStorage.setItem("figma-token", token);
    localStorage.setItem("figma-url", url);
    try {
      const res = await fetch("/api/figma/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
      setFileKey(data.fileKey);
      setFileName(data.fileName);
      setTree(data.tree);
      setRootNode(data.node);
      setActiveId(data.rootId);
      setSelectedIds(new Set([data.rootId]));
      fetchPreview(data.rootId, data.fileKey);
      const entry: HistoryEntry = {
        fileKey: data.fileKey,
        fileName: data.fileName,
        url,
        source: "rest",
        savedAt: Date.now(),
        node: data.node,
        tree: data.tree,
      };
      setHistory((h) => saveHistory(entry, h));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, url, fetchPreview]);

  const toggleBtn = (on: boolean) =>
    `rounded border px-2 py-0.5 text-[11px] font-medium ${
      on ? "border-vsc-accent bg-vsc-accent/20 text-vsc-bright" : "border-vsc-line text-vsc-muted hover:text-vsc-text"
    }`;

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] flex-col text-vsc-text">
      {/* Toolbar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-vsc-line bg-vsc-sidebar px-4 py-2.5">
        <div className="flex items-center gap-2 pr-1 text-vsc-bright">
          <Frame size={16} /> <span className="text-[14px] font-semibold">Figma → Code</span>
        </div>

        {/* Source switch */}
        <div className="flex overflow-hidden rounded-md border border-vsc-line">
          {([["rest", "Токен"], ["plugin", "Плагин"]] as ["rest" | "plugin", string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setInputMode(m)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold ${
                inputMode === m ? "bg-vsc-accent text-white" : "text-vsc-muted hover:text-vsc-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* History */}
        <div className="relative">
          <button
            onClick={() => setShowHistory((v) => !v)}
            disabled={!history.length}
            title="Недавно загруженные файлы (локальный кэш)"
            className="flex items-center gap-1 rounded-md border border-vsc-line px-2.5 py-1.5 text-[11px] font-semibold text-vsc-muted hover:text-vsc-text disabled:opacity-30"
          >
            <History size={13} /> {history.length ? `(${history.length})` : ""}
          </button>
          {showHistory && history.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-md border border-vsc-line bg-vsc-sidebar shadow-xl">
              {history.map((e) => (
                <div key={e.fileKey} className="flex items-center gap-2 border-b border-vsc-line/60 px-3 py-2 text-[13px] last:border-0 hover:bg-vsc-hover">
                  <button onClick={() => restoreEntry(e)} className="min-w-0 flex-1 text-left">
                    <div className="truncate font-medium text-vsc-text">{e.fileName}</div>
                    <div className="text-[11px] text-vsc-muted">
                      {e.source === "plugin" ? "плагин" : "токен"} ·{" "}
                      {new Date(e.savedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </button>
                  <button onClick={() => setHistory((h) => removeHistory(e.fileKey, h))} title="Убрать" className="shrink-0 text-vsc-muted hover:text-vsc-yellow">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {inputMode === "rest" ? (
          <>
            <input
              type="password"
              placeholder="Figma personal access token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-56 rounded-md border border-vsc-line bg-vsc-bg px-3 py-1.5 text-[13px] outline-none focus:border-vsc-accent"
            />
            <input
              type="text"
              placeholder="Ссылка на Figma-файл (с ?node-id=… для блока)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="min-w-[180px] flex-1 rounded-md border border-vsc-line bg-vsc-bg px-3 py-1.5 text-[13px] outline-none focus:border-vsc-accent"
            />
            <button
              onClick={load}
              disabled={loading || (!token && !url) || !url}
              className="rounded-md bg-vsc-accent px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {loading ? "Загрузка…" : "Загрузить"}
            </button>
            <a
              href="https://www.figma.com/developers/api#access-tokens"
              target="_blank"
              rel="noreferrer"
              className="text-vsc-muted hover:text-vsc-text"
              title="Где взять токен (или задайте FIGMA_TOKEN на сервере)"
            >
              <HelpCircle size={15} />
            </a>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
            <span className={`h-2 w-2 shrink-0 rounded-full ${pluginConnected ? "bg-vsc-green" : "bg-vsc-muted"}`} />
            <span className="text-vsc-muted">{pluginConnected ? "Жду данные из плагина" : "Подключение…"}</span>
            <span className="truncate text-[11px] text-vsc-muted">
              — откройте плагин «Figma Copy — Send to app», выделите блок и «Отправить выбранное».
            </span>
          </div>
        )}
      </header>

      {error && <div className="border-b border-vsc-line bg-vsc-yellow/10 px-4 py-2 text-[13px] text-vsc-yellow">{error}</div>}

      {/* Body: 3 columns */}
      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_1fr]">
        {/* Layers */}
        <aside className="flex min-h-0 flex-col border-r border-vsc-line bg-vsc-sidebar">
          <div className="border-b border-vsc-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-vsc-muted">
            {fileName ? fileName : "Слои"}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <LayerTree tree={tree} activeId={activeId} selectedIds={selectedIds} onSelect={selectNode} onToggle={toggleNode} />
          </div>
        </aside>

        {/* Preview */}
        <section className="min-h-0 border-r border-vsc-line">
          <PreviewPanel imageUrl={previewUrl} html={previewHtml} loading={previewLoading} theme={converted?.previewTheme ?? null} />
        </section>

        {/* Code / Tokens */}
        <section className="flex min-h-0 flex-col bg-vsc-sidebar">
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-vsc-line px-3 py-1.5">
            {([["code", "Код"], ["tokens", "Дизайн-токены"]] as ["code" | "tokens", string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                  rightTab === t ? "bg-vsc-accent text-white" : "text-vsc-muted hover:text-vsc-text"
                }`}
              >
                {label}
              </button>
            ))}

            {rightTab === "code" && (
              <>
                <button onClick={() => setUseTokens((v) => !v)} title="Токены палитры (bg-purple-500) вместо хексов" className={toggleBtn(useTokens)}>
                  Токены
                </button>
                <button onClick={() => setSemantic((v) => !v)} title="Семантические теги: button / h1-h6 / a" className={toggleBtn(semantic)}>
                  Семантика
                </button>
                <button onClick={() => setInferLayout((v) => !v)} title="Распознанный авто-лейаут → flex вместо absolute" className={toggleBtn(inferLayout)}>
                  Авто-flex
                </button>
                <button onClick={() => setResponsive((v) => !v)} title="Флюидный корень: w-full + max-w" className={toggleBtn(responsive)}>
                  Адаптив
                </button>
              </>
            )}

            {selectedNodes.length > 1 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-vsc-muted">Выбрано: {selectedNodes.length}</span>
                <div className="flex overflow-hidden rounded border border-vsc-line">
                  {([["combine", "Собрать"], ["separate", "Отдельно"]] as ["combine" | "separate", string][]).map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => setMultiMode(m)}
                      className={`px-2 py-0.5 text-[11px] font-medium ${
                        multiMode === m ? "bg-vsc-accent text-white" : "text-vsc-muted hover:text-vsc-text"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {rightTab === "code" && converted?.warnings?.length ? (
            <div className="border-b border-vsc-yellow/30 bg-vsc-yellow/10 px-3 py-1.5 text-[11px] text-vsc-yellow">
              <span className="font-medium">Предупреждения:</span> {converted.warnings.join("; ")}
            </div>
          ) : null}

          <div className="min-h-0 flex-1">
            {rightTab === "code" ? (
              <CodePanel
                reactCode={reactCode}
                htmlCode={htmlCode}
                vueCode={vueCode}
                cssJsx={cssJsx}
                cssText={cssText}
                onHtmlEdit={handleHtmlEdit}
                onResetHtml={resetHtml}
                htmlEdited={htmlIsEdited}
                onDownloadZip={downloadZip}
                canExport={!!converted}
              />
            ) : (
              <TokensPanel node={tokenNode} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
