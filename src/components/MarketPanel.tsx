"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Radio, WifiOff } from "lucide-react";
import { useTr } from "@/lib/i18n";

const SYMBOLS = ["btcusdt", "ethusdt", "solusdt", "bnbusdt", "xrpusdt", "dogeusdt"];
const LABEL: Record<string, string> = {
  btcusdt: "BTC", ethusdt: "ETH", solusdt: "SOL",
  bnbusdt: "BNB", xrpusdt: "XRP", dogeusdt: "DOGE",
};

interface Ticker {
  price: number;
  changePct: number;
  high: number;
  low: number;
  prevPrice: number;
}
type Status = "connecting" | "live" | "reconnecting" | "error";

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 })
  : n >= 1 ? n.toFixed(2)
  : n.toFixed(5);

export function MarketPanel() {
  const tr = useTr();
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [status, setStatus] = useState<Status>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;

    const connect = () => {
      const streams = SYMBOLS.map((s) => `${s}@miniTicker`).join("/");
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("live");
      };
      ws.onmessage = (ev) => {
        try {
          const { data } = JSON.parse(ev.data);
          if (!data?.s) return;
          const sym = data.s.toLowerCase();
          const price = +data.c;
          const open = +data.o;
          setTickers((prev) => ({
            ...prev,
            [sym]: {
              price,
              prevPrice: prev[sym]?.price ?? price,
              changePct: open ? ((price - open) / open) * 100 : 0,
              high: +data.h,
              low: +data.l,
            },
          }));
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        if (closedRef.current) return;
        // exponential backoff, capped at 15s — same pattern as in vortan-crypto.tsx
        const delay = Math.min(1000 * 2 ** attemptRef.current, 15000);
        attemptRef.current += 1;
        setStatus("reconnecting");
        timerRef.current = setTimeout(connect, delay);
      };
      ws.onerror = () => {
        setStatus("error");
        ws.close();
      };
    };

    connect();
    return () => {
      closedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, []);

  const hasData = Object.keys(tickers).length > 0;

  return (
    <div className="mt-2">
      <StatusLine status={status} />
      {!hasData && status !== "error" && (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-vsc-muted">
          <Loader2 size={15} className="animate-spin" /> {tr("Подключаемся к Binance WebSocket…")}
        </div>
      )}
      {status === "error" && !hasData && (
        <div className="mt-3 flex items-center gap-2 rounded border border-vsc-line bg-[#252526] px-3 py-2 text-[13px] text-[#f48771]">
          <WifiOff size={15} /> {tr("Binance недоступен из этой сети/региона — переподключаюсь автоматически.")}
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SYMBOLS.map((s) => {
          const t = tickers[s];
          if (!t) return null;
          const up = t.changePct >= 0;
          const tick = t.price > t.prevPrice ? "up" : t.price < t.prevPrice ? "down" : "flat";
          return (
            <div key={s} className="rounded border border-vsc-line bg-[#252526] p-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-vsc-text">{LABEL[s]}<span className="text-vsc-muted">/USDT</span></span>
                <span className={`flex items-center gap-0.5 text-[12px] ${up ? "text-[#4ec9b0]" : "text-[#f48771]"}`}>
                  {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {t.changePct.toFixed(2)}%
                </span>
              </div>
              <div
                className={`mt-1 text-xl font-semibold transition-colors duration-300 ${
                  tick === "up" ? "text-[#4ec9b0]" : tick === "down" ? "text-[#f48771]" : "text-vsc-bright"
                }`}
              >
                ${fmt(t.price)}
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-vsc-muted">
                <span>H ${fmt(t.high)}</span>
                <span>L ${fmt(t.low)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  const map = {
    connecting: { c: "#dcdcaa", t: "connecting" },
    live: { c: "#4ec9b0", t: "live · Binance WS" },
    reconnecting: { c: "#dcdcaa", t: "reconnecting (exp. backoff)" },
    error: { c: "#f48771", t: "offline · retrying" },
  }[status];
  return (
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: map.c }}>
      <Radio size={12} className={status === "live" ? "animate-pulse" : ""} /> {map.t}
    </div>
  );
}
