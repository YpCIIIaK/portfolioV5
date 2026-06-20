"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";

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
        <SyntaxHighlighter
          language={lang}
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{
            margin: 0,
            background: "transparent",
            fontSize: "12.5px",
            padding: "12px 8px",
          }}
          lineNumberStyle={{ color: "#5a5a5a", minWidth: "2.2em" }}
          codeTagProps={{
            style: { fontFamily: "var(--font-mono)" },
          }}
        >
          {code}
        </SyntaxHighlighter>
      )}
    </div>
  );
}
