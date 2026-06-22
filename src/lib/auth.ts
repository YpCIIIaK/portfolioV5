import { cookies } from "next/headers";

/**
 * Lightweight, dependency-free session for a single-owner app.
 *
 * A session is a JSON payload signed with HMAC-SHA256 (Web Crypto), stored in an
 * HttpOnly cookie. We never trust the cookie body without verifying the signature.
 * "Owner" access is granted only when the authenticated GitHub id matches
 * OWNER_GITHUB_ID — everyone else (including other valid GitHub users) is a guest.
 */

export const SESSION_COOKIE = "ws_session";
export const OAUTH_STATE_COOKIE = "ws_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  id: number; // GitHub numeric id
  login: string;
  name: string;
  avatar: string;
  owner: boolean;
  exp: number; // unix seconds
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Sign a session into a `<payload>.<signature>` token. */
export async function signSession(session: Session): Promise<string> {
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(session)));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload) as BufferSource);
  return `${payload}.${b64urlEncode(new Uint8Array(sig))}`;
}

/** Verify a token and return the session, or null if invalid/expired. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  try {
    const key = await hmacKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig) as BufferSource,
      new TextEncoder().encode(payload) as BufferSource,
    );
    if (!ok) return null;
    const session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session;
    if (!session.exp || session.exp * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Read & verify the session from the request cookies (Server Components / Route Handlers). */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** True only for the configured owner. */
export async function requireOwner(): Promise<Session | null> {
  const s = await getSession();
  return s?.owner ? s : null;
}

export function isOwnerId(id: number): boolean {
  const owner = process.env.OWNER_GITHUB_ID;
  return !!owner && String(id) === String(owner);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function makeSession(user: { id: number; login: string; name?: string | null; avatar_url?: string }): Session {
  return {
    id: user.id,
    login: user.login,
    name: user.name || user.login,
    avatar: user.avatar_url || "",
    owner: isOwnerId(user.id),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
}
