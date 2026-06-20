import { ImageResponse } from "next/og";
import { fileById } from "@/lib/files";

// Short Latin taglines per file — keeps the OG card font-safe (no Cyrillic glyphs)
// and instantly readable when a link is shared on LinkedIn / Telegram / Slack.
const TAGS: Record<string, string> = {
  "README.md": "Frontend grown into fullstack",
  ".vscode/settings.json": "Live settings.json that re-themes the site",
  "about/about.md": "Who I am — Astana / remote",
  "about/skills.json": "Tech stack: React · TS · Go · Node · AI",
  "projects/wifi-analyzer.go": "Privacy-first Wi-Fi & network analyzer · Go",
  "projects/pc-health-monitor.go": "Realtime PC health monitor · Go agent",
  "projects/repo-anti-rot.ts": "Git repo health scanner · 16 scanners",
  "projects/multi-agent-arena.ts": "An arena for AI agents · RAG + chains",
  "projects/vortan-crypto.tsx": "Crypto trading tools · Binance realtime",
  "projects/repo-visualizer.tsx": "Repo structure graphs + AI code analysis",
  "experience/hr-search-platform.md": "HR search platform · React + NestJS + OpenSearch",
  "experience/telegram-bots.md": "Telegram bots · PHP / Python automation",
  "experience/browser-extensions.md": "Browser extensions for traders · MV3",
  "live/github.stats.tsx": "Live GitHub stats — fetched in real time",
  "live/contributions.tsx": "Live contributions heatmap",
  "live/market.live.tsx": "Live crypto market · Binance WebSocket",
  "meta/ai-usage.json": "AI usage · Claude Code + OpenRouter, real stats",
  "contact/contact.tsx": "Get in touch — open to offers",
};

const ACCENT = "#0a84ff";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("file") ?? "";
  const f = fileById(id);

  const tabName = f ? f.name : "README.md";
  const path = f ? id : "README.md";
  const tag = (f && TAGS[id]) || TAGS["README.md"];
  const lang = f?.language ?? "Markdown";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#1e1e1e",
          fontFamily: "monospace",
        }}
      >
        {/* title bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 56,
            background: "#323233",
            padding: "0 24px",
          }}
        >
          <div style={{ display: "flex" }}>
            <div style={{ width: 14, height: 14, borderRadius: 14, background: "#ff5f56", marginRight: 10 }} />
            <div style={{ width: 14, height: 14, borderRadius: 14, background: "#ffbd2e", marginRight: 10 }} />
            <div style={{ width: 14, height: 14, borderRadius: 14, background: "#27c93f" }} />
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: 28,
              padding: "9px 18px",
              background: "#1e1e1e",
              color: "#ffffff",
              fontSize: 22,
              borderTop: `2px solid ${ACCENT}`,
            }}
          >
            {tabName}
          </div>
        </div>

        {/* body */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 64px 0 64px" }}>
          <div style={{ display: "flex", color: "#6a9955", fontSize: 26, marginBottom: 18 }}>
            {`// ${path}`}
          </div>
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 70,
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: 1040,
            }}
          >
            {tag}
          </div>
          <div style={{ display: "flex", marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                color: ACCENT,
                fontSize: 24,
                border: `1px solid ${ACCENT}`,
                borderRadius: 8,
                padding: "6px 16px",
              }}
            >
              {lang}
            </div>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "26px 64px",
            borderTop: "1px solid #333333",
          }}
        >
          <div style={{ display: "flex", color: ACCENT, fontSize: 30, fontWeight: 600 }}>
            Vladimir — Fullstack Developer
          </div>
          <div style={{ display: "flex", color: "#888888", fontSize: 26 }}>github.com/YpCIIIaK</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    }
  );
}
