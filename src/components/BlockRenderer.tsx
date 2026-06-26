"use client";

import { ExternalLink, Info } from "lucide-react";
import type { Block } from "@/lib/types";
import { useTr } from "@/lib/i18n";
import { CodeBlock } from "./CodeBlock";

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8 leading-relaxed">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block: b }: { block: Block }) {
  const tr = useTr();
  switch (b.t) {
    case "h1":
      return (
        <h1 className="mb-4 mt-2 text-2xl font-semibold text-vsc-bright">
          {tr(b.text)}
        </h1>
      );
    case "h2":
      return (
        <h2 className="mb-3 mt-7 border-b border-vsc-line pb-1.5 text-lg font-semibold text-vsc-bright">
          {tr(b.text)}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mb-2 mt-5 text-[15px] font-semibold text-vsc-light-blue">
          {tr(b.text)}
        </h3>
      );
    case "p":
      return <p className="my-3 text-[13.5px] text-vsc-text">{tr(b.text)}</p>;
    case "ul":
      return (
        <ul className="my-3 space-y-1.5">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] text-vsc-text">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-vsc-accent" />
              <span>{tr(it)}</span>
            </li>
          ))}
        </ul>
      );
    case "metrics":
      return (
        <div className="my-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {b.items.map((m, i) => (
            <div
              key={i}
              className="rounded border border-vsc-line bg-[#252526] px-3 py-2.5"
            >
              <div className="text-[11px] uppercase tracking-wide text-vsc-muted">
                {tr(m.label)}
              </div>
              <div className="mt-1 text-[13px] font-medium text-vsc-green">
                {tr(m.value)}
              </div>
            </div>
          ))}
        </div>
      );
    case "tech":
      return (
        <div className="my-4 flex flex-wrap gap-1.5">
          {b.items.map((t, i) => (
            <span
              key={i}
              className="rounded border border-vsc-line bg-[#2d2d2d] px-2 py-0.5 font-mono text-[11px] text-vsc-light-blue"
            >
              {t}
            </span>
          ))}
        </div>
      );
    case "code":
      return (
        <CodeBlock
          lang={b.lang}
          code={b.code}
          caption={b.caption ? tr(b.caption) : b.caption}
          collapsible={b.collapsible}
        />
      );
    case "callout":
      return (
        <div className="my-4 flex gap-2.5 rounded border-l-2 border-vsc-accent bg-[#252526] px-3.5 py-2.5">
          <Info size={16} className="mt-0.5 shrink-0 text-vsc-accent" />
          <p className="text-[13px] text-vsc-text">{tr(b.text)}</p>
        </div>
      );
    case "links":
      return (
        <div className="my-4 flex flex-wrap gap-2">
          {b.items.map((l, i) => (
            <a
              key={i}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded border border-vsc-line bg-[#2d2d2d] px-3 py-1.5 text-[12.5px] text-vsc-light-blue transition-colors hover:border-vsc-accent hover:text-vsc-bright"
            >
              <ExternalLink size={13} />
              {tr(l.label)}
            </a>
          ))}
        </div>
      );
    case "divider":
      return <hr className="my-6 border-vsc-line" />;
  }
}
