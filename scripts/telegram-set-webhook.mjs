/**
 * One-time: point your Telegram bot at the assistant webhook (or delete it).
 *
 * Prereqs in .env:
 *   TELEGRAM_BOT_TOKEN            — the bot's token (already used for notify)
 *   TELEGRAM_CHAT_ID             — your chat id (the bot only answers you)
 *   TELEGRAM_BOT_WEBHOOK_SECRET  — any random string; must match the server env
 *   PUBLIC_BASE_URL              — https origin of the deployment (no trailing /)
 *
 * Run:  node scripts/telegram-set-webhook.mjs          # set the webhook
 *       node scripts/telegram-set-webhook.mjs --delete # remove it
 *
 * The webhook URL is <PUBLIC_BASE_URL>/api/telegram/bot. Telegram will send the
 * secret in the X-Telegram-Bot-Api-Secret-Token header on every update.
 */

import { readFileSync } from "node:fs";

// Minimal .env loader so you can just fill .env and run this directly.
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env — rely on real environment variables
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET;
const base = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const del = process.argv.includes("--delete");
const api = (method) => `https://api.telegram.org/bot${token}/${method}`;

async function main() {
  if (del) {
    const res = await fetch(api("deleteWebhook"), { method: "POST" });
    console.log(await res.json());
    return;
  }

  if (!base) {
    console.error("PUBLIC_BASE_URL не задан (например https://your-app.vercel.app)");
    process.exit(1);
  }
  if (!secret) {
    console.error("TELEGRAM_BOT_WEBHOOK_SECRET не задан — задай любую случайную строку");
    process.exit(1);
  }

  const url = `${base}/api/telegram/bot`;
  const res = await fetch(api("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });
  const json = await res.json();
  console.log(json.ok ? `Webhook установлен: ${url}` : json);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
