/**
 * One-time Telegram login → prints a StringSession for TELEGRAM_SESSION.
 *
 * Prereqs: get api_id / api_hash at https://my.telegram.org → API development
 * tools, then put them in .env as TELEGRAM_API_ID / TELEGRAM_API_HASH.
 *
 * Run:  node scripts/telegram-login.mjs
 * It asks for your phone, the login code Telegram sends you, and (if set) your
 * 2FA password, then prints TELEGRAM_SESSION=... — paste that into .env.
 *
 * The session string is a full credential for your account. Never commit it,
 * never expose it to the browser.
 */

import { readFileSync } from "node:fs";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";

// Minimal .env loader so you can just fill .env and run this directly.
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env — rely on real environment variables
}

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

if (!apiId || !apiHash) {
  console.error("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env first (from https://my.telegram.org).");
  process.exit(1);
}

const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 3 });

await client.start({
  phoneNumber: () => input.text("Телефон (в формате +7999...): "),
  password: () => input.text("Пароль 2FA (если включён, иначе Enter): "),
  phoneCode: () => input.text("Код из Telegram: "),
  onError: (err) => console.error(err),
});

console.log("\n✅ Готово. Вставь строку ниже в .env:\n");
console.log("TELEGRAM_SESSION=" + client.session.save());
await client.disconnect();
process.exit(0);
