"use client";

import { lazy, Suspense, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";

/** The highlighter is heavy (grammars + themes) — split it out of the main
 *  bundle and show the plain code as a fallback while it loads. */
const CodeHighlight = lazy(() => import("./CodeHighlight"));

/** Un-highlighted fallback with the same metrics, shown while the grammar loads. */
function PlainCode({ code }: { code: string }) {
  return (
    <pre
      className="m-0 overflow-x-auto whitespace-pre px-2 py-3 text-[12.5px] leading-normal text-[#d4d4d4]"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {code
        .split("\n")
        .map((l, i) => `${String(i + 1).padStart(3, " ")}  ${l}`)
        .join("\n")}
    </pre>
  );
}

export function CodeBlock({
  lang,
  code,
  caption,
  collapsible,
}: {
  lang: string;
  code: string;
  caption?: string;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded border border-vsc-line bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-vsc-line bg-[#252526] px-3 py-1.5">
        <button
          onClick={() => collapsible && setOpen((o) => !o)}
          className={`flex items-center gap-1.5 text-[11px] text-vsc-muted ${
            collapsible ? "cursor-pointer hover:text-vsc-text" : "cursor-default"
          }`}
        >
          {collapsible &&
            (open ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
          <span className="font-mono uppercase tracking-wide">{lang}</span>
          {caption && (
            <span className="ml-2 normal-case tracking-normal text-vsc-muted">
              {caption}
            </span>
          )}
        </button>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] text-vsc-muted transition-colors hover:text-vsc-text"
          aria-label="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {open && (
        <Suspense fallback={<PlainCode code={code} />}>
          <CodeHighlight lang={lang} code={code} />
        </Suspense>
      )}
    </div>
  );
}
