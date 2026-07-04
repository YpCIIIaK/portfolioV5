"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/** Heavy syntax-highlighter body, loaded lazily from CodeBlock via next/dynamic. */
export default function CodeHighlight({ lang, code }: { lang: string; code: string }) {
  return (
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
  );
}
