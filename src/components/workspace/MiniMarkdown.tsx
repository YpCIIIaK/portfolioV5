import React from "react";

/**
 * Tiny, dependency-free Markdown renderer for AI answers. Covers what the model
 * actually emits: headings, bullet/numbered lists, bold/italic, inline code and
 * links. Builds React nodes directly (no dangerouslySetInnerHTML).
 */

// Inline: `code`, **bold**, *italic*, [text](url). Code is matched first so we
// don't parse markup inside it.
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  let i = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("`")) {
      out.push(<code key={key} className="rounded bg-vsc-line/60 px-1 py-0.5 font-mono text-[12px]">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      out.push(<strong key={key} className="font-semibold text-vsc-bright">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (mm) out.push(<a key={key} href={mm[2]} target="_blank" rel="noreferrer" className="text-vsc-light-blue hover:underline">{mm[1]}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MiniMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`p-${k++}`} className="leading-relaxed">
          {para.map((l, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {inline(l, `p${k}-${i}`)}
            </React.Fragment>
          ))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items;
      const cls = "my-1 space-y-0.5 pl-5 " + (list.ordered ? "list-decimal" : "list-disc");
      blocks.push(
        list.ordered
          ? <ol key={`l-${k++}`} className={cls}>{items.map((it, i) => <li key={i}>{inline(it, `li${k}-${i}`)}</li>)}</ol>
          : <ul key={`l-${k++}`} className={cls}>{items.map((it, i) => <li key={i}>{inline(it, `li${k}-${i}`)}</li>)}</ul>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);

    if (line.trim() === "") {
      flushPara();
      flushList();
    } else if (heading) {
      flushPara();
      flushList();
      const size = heading[1].length === 1 ? "text-[15px]" : "text-[14px]";
      blocks.push(<div key={`h-${k++}`} className={`mt-1 font-semibold text-vsc-bright ${size}`}>{inline(heading[2], `h${k}`)}</div>);
    } else if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      const item = (bullet ? bullet[1] : numbered![1]);
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push(item);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="space-y-2 text-[13px] text-vsc-text">{blocks}</div>;
}
