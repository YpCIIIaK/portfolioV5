"use client";

import { useEffect, useRef, useState } from "react";

/** Compact always-on BTC price in the status bar — ambient "this site is alive" signal. */
export function LiveTicker() {
  const [price, setPrice] = useState<number | null>(null);
  const [dir, setDir] = useState<"up" | "down" | "flat">("flat");
  const prev = useRef<number | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@miniTicker");
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          const p = +d.c;
          setDir(prev.current == null ? "flat" : p > prev.current ? "up" : p < prev.current ? "down" : "flat");
          prev.current = p;
          setPrice(p);
          attempt = 0;
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        timer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 15000));
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, []);

  if (price == null) return null;
  const color = dir === "up" ? "#9be7d0" : dir === "down" ? "#ffb3a1" : "#ffffff";
  return (
    <span className="flex items-center gap-1 px-2 font-mono" title="Live BTC/USDT — Binance WebSocket">
      <span className="h-1.5 w-1.5 rounded-full bg-[#4ec9b0]" />
      BTC
      <span style={{ color }}>${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
    </span>
  );
}
